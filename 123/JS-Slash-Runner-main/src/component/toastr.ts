declare namespace globalThis {
  let toastr: typeof import('toastr');
}

export function initializeToastr() {
  globalThis.toastr = toastr;
}
