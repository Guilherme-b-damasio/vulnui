"use client";
import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [url, setUrl] = useState("http://testphp.vulnweb.com/");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para progresso ZAP
  const [spiderProgress, setSpiderProgress] = useState(0);
  const [activeProgress, setActiveProgress] = useState(0);

  // Para guardar os scanIds e controlar polling
  const spiderScanIdRef = useRef<string | null>(null);
  const activeScanIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAlerts = async (url: string): Promise<any[]> => {
    const res = await fetch(`/api/scanner/zap/alerts?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    console.log("Alertas do ZAP:", data);
    return data.alerts || [];
  };


  const runScan = async (type: string) => {
    if (!url) return alert("Informe uma URL");
    setLoading(true);
    setResult("");
    setSpiderProgress(0);
    setActiveProgress(0);

    if (type === "nikto") {
      // Simples: só dispara, espera resultado, sem barra
      try {
        const res = await fetch(`/api/scanner/nikto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        setResult(JSON.stringify(data, null, 2));
      } catch (err) {
        if (err instanceof Error) setResult(`Erro: ${err.message}`);
        else setResult("Erro desconhecido");
      }
      setLoading(false);
      return;
    }

    if (type === "zap/scan") {
      try {
        // Inicia o scan e espera receber os dois scanIds
        const res = await fetch(`/api/scanner/zap/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();

        spiderScanIdRef.current = data.spiderScanId;
        activeScanIdRef.current = data.activeScanId;
        setResult("Scan iniciado. Aguardando progresso...");

        // Começa polling para atualizar progresso
        intervalRef.current = setInterval(async () => {
          if (!spiderScanIdRef.current || !activeScanIdRef.current) return;

          try {
            const statusRes = await fetch(
              `/api/scanner/zap/status?spiderScanId=${spiderScanIdRef.current}&activeScanId=${activeScanIdRef.current}`
            );
            const statusData = await statusRes.json();

            setSpiderProgress(Number(statusData.spiderStatus));
            setActiveProgress(Number(statusData.activeStatus));

            if (
              Number(statusData.spiderStatus) === 100 &&
              Number(statusData.activeStatus) === 100
            ) {
              clearInterval(intervalRef.current!);
              spiderScanIdRef.current = null;
              activeScanIdRef.current = null;
              setLoading(false);
              const allAlerts = await fetchAlerts(url);
              const alerts = allAlerts.filter(alert => alert.risk === 'High');
              setResult(JSON.stringify(alerts, null, 2));
            }
          } catch {
            clearInterval(intervalRef.current!);
            spiderScanIdRef.current = null;
            activeScanIdRef.current = null;
            setLoading(false);
            setResult("Erro ao consultar status do scan.");
          }
        }, 1000);
      } catch (err) {
        setLoading(false);
        if (err instanceof Error) {
          setResult(`Erro: ${err.message}`);
        } else {
          setResult("Erro desconhecido");
        }
      }
    }
  };

  // Limpa intervalo ao desmontar o componente
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Scanner de Vulnerabilidades teste</h1>
      <input
        type="text"
        placeholder="Digite a URL (ex: http://testphp.vulnweb.com)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "100%", padding: "8px", marginBottom: "1rem" }}
      />
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={() => runScan("zap/scan")} disabled={loading}>
          Executar ZAP
        </button>
        <button onClick={() => runScan("nikto")} disabled={loading}>
          Executar Nikto
        </button>
      </div>

      {loading && (
        <>
          <p>Executando scan...</p>
          <div>
            <label>Spider Scan:</label>
            <progress value={spiderProgress} max={100} style={{ width: "100%" }} />
            <span>{spiderProgress}%</span>
          </div>
          <div>
            <label>Active Scan:</label>
            <progress value={activeProgress} max={100} style={{ width: "100%" }} />
            <span>{activeProgress}%</span>
          </div>
        </>
      )}

      {result && (
        <pre
          style={{
            backgroundColor: "#000000ff",
            padding: "1rem",
            whiteSpace: "pre-wrap",
            borderRadius: "5px",
            marginTop: "1rem",
          }}
        >
          {result}
        </pre>
      )}
    </div>
  );
}
