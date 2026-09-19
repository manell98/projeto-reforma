export const environment = {
  production: false,
  // Ver comentário em environment.ts sobre a derivação dinâmica do host.
  apiUrl: `${window.location.protocol}//${window.location.hostname}:3000`,
};
