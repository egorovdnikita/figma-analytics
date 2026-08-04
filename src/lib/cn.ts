import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** clsx + tailwind-merge: последний конфликтующий класс выигрывает. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
