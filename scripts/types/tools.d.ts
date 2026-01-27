export type StringValues<T> = {
    [K in keyof T]: string
}

type RequiredNotNull<T> = {
    [P in keyof T]: NonNullable<T[P]>
}

export type PickNonNullable<T, K extends keyof T> = RequiredNotNull<Pick<T, K>>


/**
 * Garder le type, sauf pour les propriété listées par K qui deviennent optionnelles
 */
export type PartialBy<T, PartialList extends keyof T> = Omit<T, PartialList> & Partial<Pick<T, PartialList>>
