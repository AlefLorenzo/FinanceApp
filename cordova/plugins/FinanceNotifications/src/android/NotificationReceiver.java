package com.financeapp.notifications;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class NotificationReceiver extends BroadcastReceiver {

    private static final String TAG = "FinanceNotifReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        if ("android.intent.action.BOOT_COMPLETED".equals(action)) {
            // On boot, we rely on JS sync when the app opens next time.
            Log.d(TAG, "Boot completed received — awaiting JS sync on next app open.");
            return;
        }

        if ("com.financeapp.DELIVER_NOTIFICATION".equals(action)) {
            int id = intent.getIntExtra("notif_id", 0);
            String title = intent.getStringExtra("notif_title");
            String message = intent.getStringExtra("notif_message");

            if (title == null) title = "Finance App";
            if (message == null) message = "";

            Log.d(TAG, "Delivering notification id=" + id + " title=" + title);

            // Get the app launch intent
            Intent launchIntent = context.getPackageManager()
                    .getLaunchIntentForPackage(context.getPackageName());
            if (launchIntent != null) {
                launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            }

            PendingIntent contentIntent = PendingIntent.getActivity(
                    context,
                    id,
                    launchIntent != null ? launchIntent : new Intent(),
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Build and show the notification
            NotificationCompat.Builder builder = new NotificationCompat.Builder(
                    context, FinanceNotifications.CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_dialog_info)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .setContentIntent(contentIntent);

            NotificationManager nm = (NotificationManager)
                    context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(id, builder.build());
                Log.d(TAG, "Notification shown: id=" + id);
            }
        }
    }
}
