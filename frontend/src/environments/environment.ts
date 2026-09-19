export const environment = {
  production: true,
  // Deriva o host da API a partir de onde a página foi carregada (localhost no
  // PC, IP de LAN no celular, ou um domínio real em produção atrás de HTTPS),
  // já que a porta do backend é sempre fixa (3000) e não há como descobri-la
  // em runtime. Isso permite abrir o app do celular na mesma wifi apontando
  // pro IP do PC sem precisar reconfigurar nada.
  apiUrl: `${window.location.protocol}//${window.location.hostname}:3000`,
};
