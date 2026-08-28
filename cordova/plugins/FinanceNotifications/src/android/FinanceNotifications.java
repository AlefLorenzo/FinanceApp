package com.financeapp.notifications;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;

public class FinanceNotifications extends CordovaPlugin {

    private static final String TAG = "FinanceNotifications";
    public static final String CHANNEL_ID = "finance_reminders";
    public static final String CHANNEL_NAME = "Lembretes financeiros";
    private static final int PERMISSION_REQUEST_CODE = 9001;

    private CallbackContext permissionCallback;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext)
            throws JSONException {

        switch (action) {
            case "requestPermission":
                requestPermission(callbackContext);
                return true;
            case "createChannel":
                createChannel(callbackContext);
                return true;
            case "schedule":
                int id = args.getInt(0);
                String title = args.getString(1);
                String message = args.getString(2);
                long triggerAtMillis = args.getLong(3);
                scheduleNotification(id, title, message, triggerAtMillis, callbackContext);
                return true;
            case "cancel":
                int cancelId = args.getInt(0);
                cancelNotification(cancelId, callbackContext);
                return true;
            case "cancelAll":
                cancelAllNotifications(callbackContext);
                return true;
        }
        return false;
    }

    private void requestPermission(CallbackContext callbackContext) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            // Android < 13: permission not needed
            callbackContext.success("granted");
            return;
        }
        Activity activity = cordova.getActivity();
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
            callbackContext.success("granted");
            return;
        }
        // Store callback and request
        permissionCallback = callbackContext;
        cordova.requestPermission(this, PERMISSION_REQUEST_CODE,
                Manifest.permission.POST_NOTIFICATIONS);
    }

    @Override
    public void onRequestPermissionResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == PERMISSION_REQUEST_CODE && permissionCallback != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                permissionCallback.success("granted");
            } else {
                permissionCallback.success("denied");
            }
            permissionCallback = null;
        }
    }

    private void createChannel(CallbackContext callbackContext) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context ctx = cordova.getActivity().getApplicationContext();
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Alertas de vencimento de contas e receitas");
                channel.enableVibration(true);
                nm.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created: " + CHANNEL_ID);
            }
        }
        callbackContext.success("ok");
    }

    private void scheduleNotification(int id, String title, String message,
            long triggerAtMillis, CallbackContext callbackContext) {
        try {
            Context ctx = cordova.getActivity().getApplicationContext();
            AlarmManager alarmManager = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                callbackContext.error("AlarmManager not available");
                return;
            }

            Intent intent = new Intent(ctx, NotificationReceiver.class);
            intent.setAction("com.financeapp.DELIVER_NOTIFICATION");
            intent.putExtra("notif_id", id);
            intent.putExtra("notif_title", title);
            intent.putExtra("notif_message", message);

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    ctx,
                    id,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            long now = System.currentTimeMillis();
            if (triggerAtMillis <= now) {
                // Time already passed — deliver immediately
                Log.d(TAG, "Trigger time passed, delivering immediately: id=" + id);
                ctx.sendBroadcast(intent);
                callbackContext.success("immediate");
                return;
            }

            // Use setExactAndAllowWhileIdle for reliable delivery
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+: check if we can schedule exact alarms
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                } else {
                    // Fallback: setAndAllowWhileIdle (less precise but works)
                    alarmManager.setAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
                }
            } else {
                alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
            }

            Log.d(TAG, "Notification scheduled: id=" + id + " at=" + triggerAtMillis);
            callbackContext.success("scheduled");
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling notification", e);
            callbackContext.error("Error: " + e.getMessage());
        }
    }

    private void cancelNotification(int id, CallbackContext callbackContext) {
        try {
            Context ctx = cordova.getActivity().getApplicationContext();
            AlarmManager alarmManager = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);

            Intent intent = new Intent(ctx, NotificationReceiver.class);
            intent.setAction("com.financeapp.DELIVER_NOTIFICATION");
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    ctx,
                    id,
                    intent,
                    PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );

            if (pendingIntent != null && alarmManager != null) {
                alarmManager.cancel(pendingIntent);
                pendingIntent.cancel();
            }

            // Also dismiss if already shown
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(id);
            }

            Log.d(TAG, "Notification cancelled: id=" + id);
            callbackContext.success("cancelled");
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling notification", e);
            callbackContext.error("Error: " + e.getMessage());
        }
    }

    private void cancelAllNotifications(CallbackContext callbackContext) {
        try {
            Context ctx = cordova.getActivity().getApplicationContext();
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancelAll();
            }
            callbackContext.success("all_cancelled");
        } catch (Exception e) {
            callbackContext.error("Error: " + e.getMessage());
        }
    }
}
