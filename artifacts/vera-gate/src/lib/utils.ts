import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateString));
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'MENUNGGU':
      return 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20';
    case 'SUKSES':
      return 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20';
    case 'GAGAL':
      return 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20';
    case 'KEDALUWARSA':
      return 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20 border-gray-500/20';
  }
}
