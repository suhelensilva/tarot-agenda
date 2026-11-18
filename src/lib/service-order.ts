// Ordem alfabética dos serviços pela primeira LETRA do nome: ignora emoji,
// símbolos, aspas e espaços no começo, e acentos/maiúsculas.
export function serviceSortKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .toLocaleLowerCase("pt-BR")
}

export function byServiceName<T extends { name: string }>(a: T, b: T) {
  return serviceSortKey(a.name).localeCompare(serviceSortKey(b.name), "pt-BR", { numeric: true })
}

/** Só os ativos, em ordem alfabética. */
export function activeServicesAZ<T extends { name: string; active?: boolean }>(list: T[]) {
  return list.filter((s) => s.active !== false).sort(byServiceName)
}
