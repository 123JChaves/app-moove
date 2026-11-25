/** Métricas em memória, expostas em formato Prometheus (GET /auditoria/metrics). */
const BUCKETS_MS = [10, 50, 100, 250, 500, 1000, 2500];
const contadores = new Map<string, number>();
const histograma = new Map<string, { buckets: number[]; soma: number; total: number }>();

const rotular = (r: Record<string, string | number> = {}) => {
    const s = Object.entries(r).map(([k, v]) => `${k}="${String(v).replace(/"/g, "'")}"`).join(",");
    return s ? `{${s}}` : "";
};

export function incrementar(nome: string, rotulos?: Record<string, string | number>, valor = 1) {
    const k = `${nome}${rotular(rotulos)}`;
    contadores.set(k, (contadores.get(k) || 0) + valor);
}

export function obterContador(nome: string, rotulos?: Record<string, string | number>) {
    return contadores.get(`${nome}${rotular(rotulos)}`) || 0;
}

export function observarLatencia(rotulos: Record<string, string | number>, ms: number) {
    const k = rotular(rotulos);
    const h = histograma.get(k) || { buckets: BUCKETS_MS.map(() => 0), soma: 0, total: 0 };
    BUCKETS_MS.forEach((limite, i) => { if (ms <= limite) h.buckets[i]++; });
    h.soma += ms;
    h.total++;
    histograma.set(k, h);
}

export function renderizarPrometheus(): string {
    const linhas = [
        "# TYPE auditoria_up gauge", "auditoria_up 1",
        "# TYPE auditoria_uptime_segundos gauge", `auditoria_uptime_segundos ${Math.round(process.uptime())}`,
    ];
    for (const [k, v] of contadores) linhas.push(`${k} ${v}`);
    for (const [rotulos, h] of histograma) {
        const base = rotulos.slice(1, -1);
        BUCKETS_MS.forEach((le, i) => linhas.push(`auditoria_http_duracao_ms_bucket{${base},le="${le}"} ${h.buckets[i]}`));
        linhas.push(`auditoria_http_duracao_ms_bucket{${base},le="+Inf"} ${h.total}`);
        linhas.push(`auditoria_http_duracao_ms_sum{${base}} ${h.soma}`);
        linhas.push(`auditoria_http_duracao_ms_count{${base}} ${h.total}`);
    }
    return linhas.join("\n") + "\n";
}

export function zerarMetricas() {
    contadores.clear();
    histograma.clear();
}
