import { getCurrentInstance } from 'vue'

let snackbarMethods: any = null

export function registerSnackbar(methods: any) {
  snackbarMethods = methods
}

export function showSuccessMessage(msg: string) {
  snackbarMethods?.showSuccessMessage(msg)
}

export function showErrorMessage(msg: string) {
  snackbarMethods?.showErrorMessage(msg)
}
