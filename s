warning: in the working copy of 'src/components/AccountList.tsx', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/src/components/AccountList.tsx b/src/components/AccountList.tsx[m
[1mindex 91a4772..c66098e 100644[m
[1m--- a/src/components/AccountList.tsx[m
[1m+++ b/src/components/AccountList.tsx[m
[36m@@ -1,8 +1,9 @@[m
[31m-﻿import { formatBRLFromCents } from '../utils/currency';[m
[32m+[m[32m﻿import { useEffect, useState } from 'react';[m
[32m+[m[32mimport { formatBRLFromCents } from '../utils/currency';[m
 import { useAccounts } from '../hooks/useAccounts';[m
 import { AccountService } from '../services/AccountService';[m
 import { getTodayISO } from '../utils/date';[m
[31m-import { CheckCircle2, Circle } from 'lucide-react';[m
[32m+[m[32mimport { CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react';[m
 import type { Account } from '../types';[m
 [m
 interface Props {[m
[36m@@ -11,10 +12,14 @@[m [minterface Props {[m
   type?: 'expense' | 'income';[m
 }[m
 [m
[32m+[m[32mconst ITEMS_PER_PAGE = 4;[m
[32m+[m
 export function AccountList({ limit, hidePaid, type }: Props) {[m
   const { accounts, togglePaid } = useAccounts();[m
   const today = getTodayISO();[m
 [m
[32m+[m[32m  const [currentPage, setCurrentPage] = useState(1);[m
[32m+[m
   const getPriorityColor = (priority: string) => {[m
     switch (priority) {[m
       case 'urgent':[m
[36m@@ -69,16 +74,6 @@[m [mexport function AccountList({ limit, hidePaid, type }: Props) {[m
     );[m
   }[m
 [m
[31m-  if (filteredAccounts.length === 0) {[m
[31m-    return ([m
[31m-      <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border border-dashed border-gray-300">[m
[31m-        {type === 'income'[m
[31m-          ? 'Nenhuma receita cadastrada.'[m
[31m-          : 'Nenhuma despesa cadastrada.'}[m
[31m-      </div>[m
[31m-    );[m
[31m-  }[m
[31m-[m
   filteredAccounts.sort((a, b) => {[m
     const scoreA = getSortScore(a);[m
     const scoreB = getSortScore(b);[m
[36m@@ -90,105 +85,206 @@[m [mexport function AccountList({ limit, hidePaid, type }: Props) {[m
     return a.due_date.localeCompare(b.due_date);[m
   });[m
 [m
[32m+[m[32m  /*[m
[32m+[m[32m   * HOME[m
[32m+[m[32m   * Quando o componente recebe "limit", mantém o comportamento antigo:[m
[32m+[m[32m   * mostra somente a quantidade solicitada e não cria paginação.[m
[32m+[m[32m   */[m
   if (limit) {[m
     filteredAccounts = filteredAccounts.slice(0, limit);[m
   }[m
 [m
[32m+[m[32m  /*[m
[32m+[m[32m   * PÁGINA CONTAS[m
[32m+[m[32m   * Sem "limit", a lista completa é dividida em páginas de 4.[m
[32m+[m[32m   */[m
[32m+[m[32m  const totalPages = limit[m
[32m+[m[32m    ? 1[m
[32m+[m[32m    : Math.max(1, Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE));[m
[32m+[m
[32m+[m[32m  /*[m
[32m+[m[32m   * Se filtros ou quantidade de contas mudarem e a página atual[m
[32m+[m[32m   * deixar de existir, volta automaticamente para a última página válida.[m
[32m+[m[32m   */[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    setCurrentPage(page => Math.min(page, totalPages));[m
[32m+[m[32m  }, [totalPages]);[m
[32m+[m
[32m+[m[32m  /*[m
[32m+[m[32m   * Quando mudar o tipo ou esconder/mostrar contas pagas,[m
[32m+[m[32m   * começa novamente na primeira página.[m
[32m+[m[32m   */[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    setCurrentPage(1);[m
[32m+[m[32m  }, [type, hidePaid]);[m
[32m+[m
[32m+[m[32m  if (filteredAccounts.length === 0) {[m
[32m+[m[32m    return ([m
[32m+[m[32m      <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border border-dashed border-gray-300">[m
[32m+[m[32m        {type === 'income'[m
[32m+[m[32m          ? 'Nenhuma receita cadastrada.'[m
[32m+[m[32m          : 'Nenhuma despesa cadastrada.'}[m
[32m+[m[32m      </div>[m
[32m+[m[32m    );[m
[32m+[m[32m  }[m
[32m+[m
[32m+[m[32m  const startIndex = limit[m
[32m+[m[32m    ? 0[m
[32m+[m[32m    : (currentPage - 1) * ITEMS_PER_PAGE;[m
[32m+[m
[32m+[m[32m  const visibleAccounts = limit[m
[32m+[m[32m    ? filteredAccounts[m
[32m+[m[32m    : filteredAccounts.slice([m
[32m+[m[32m        startIndex,[m
[32m+[m[32m        startIndex + ITEMS_PER_PAGE[m
[32m+[m[32m      );[m
[32m+[m
   return ([m
[31m-    <div className="space-y-3 w-full">[m
[31m-      {filteredAccounts.map(account => {[m
[31m-        const priority = AccountService.calculatePriority(account);[m
[31m-        const isPaid = account.status === 'paid';[m
[31m-        const isOverdue = AccountService.isAccountOverdue(account);[m
[31m-        const isToday = account.due_date === today && !isPaid;[m
[31m-[m
[31m-        return ([m
[31m-          <div[m
[31m-            key={account.id}[m
[31m-            className={`w-full p-4 rounded-2xl shadow-sm border-l-4 bg-white flex items-center justify-between transition-all gap-3 ${[m
[31m-              isPaid[m
[31m-                ? 'border-gray-200 opacity-60'[m
[31m-                : (account.type as string) === 'income'[m
[31m-                  ? 'border-green-500'[m
[31m-                  : isOverdue[m
[31m-                    ? 'border-red-600'[m
[31m-                    : isToday[m
[31m-                      ? 'border-yellow-500'[m
[31m-                      : 'border-blue-500'[m
[31m-            }`}[m
[31m-          >[m
[31m-            <div className="flex flex-col flex-1 min-w-0">[m
[31m-              <h3[m
[31m-                className={`font-bold text-base break-words whitespace-normal ${[m
[31m-                  isPaid[m
[31m-                    ? 'line-through text-gray-500'[m
[31m-                    : 'text-gray-900'[m
[31m-                }`}[m
[31m-              >[m
[31m-                {account.title}[m
[31m-              </h3>[m
[31m-[m
[31m-              <div className="flex items-center gap-2 mt-1 flex-wrap">[m
[31m-                <span className="text-xs font-medium text-gray-500 shrink-0">[m
[31m-                  {account.due_date.split('-').reverse().join('/')}[m
[31m-                </span>[m
[32m+[m[32m    <div className="space-y-4 w-full">[m
 [m
[31m-                {!isPaid && ([m
[31m-                  <span[m
[31m-                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border shrink-0 ${[m
[31m-                      isOverdue[m
[31m-                        ? 'text-red-700 bg-red-100 border-red-200'[m
[31m-                        : isToday[m
[31m-                          ? 'text-yellow-700 bg-yellow-100 border-yellow-200'[m
[31m-                          : getPriorityColor(priority)[m
[31m-                    }`}[m
[31m-                  >[m
[31m-                    {isOverdue[m
[31m-                      ? 'Atrasada'[m
[32m+[m[32m      <div className="space-y-3 w-full">[m
[32m+[m[32m        {visibleAccounts.map(account => {[m
[32m+[m[32m          const priority = AccountService.calculatePriority(account);[m
[32m+[m[32m          const isPaid = account.status === 'paid';[m
[32m+[m[32m          const isOverdue = AccountService.isAccountOverdue(account);[m
[32m+[m[32m          const isToday = account.due_date === today && !isPaid;[m
[32m+[m
[32m+[m[32m          return ([m
[32m+[m[32m            <div[m
[32m+[m[32m              key={account.id}[m
[32m+[m[32m              className={`w-full p-4 rounded-2xl shadow-sm border-l-4 bg-white flex items-center justify-between transition-all gap-3 ${[m
[32m+[m[32m                isPaid[m
[32m+[m[32m                  ? 'border-gray-200 opacity-60'[m
[32m+[m[32m                  : (account.type as string) === 'income'[m
[32m+[m[32m                    ? 'border-green-500'[m
[32m+[m[32m                    : isOverdue[m
[32m+[m[32m                      ? 'border-red-600'[m
                       : isToday[m
[31m-                        ? 'Ve