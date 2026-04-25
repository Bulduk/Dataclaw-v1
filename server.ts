import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

// --- AI Setup ---
// (Gemini API calls removed as per user request, system now completely simulated via OpenClaw and CrewAI orchestrator)

// --- Orchestrator Logic ---
interface AgentConfig {
  id: string;
  name: string;
  source: string;
  role: string;
  model: string;
  prompt: string;
  enabled: boolean;
  risk_level: string;
  confidence_threshold: number;
  api_endpoint?: string;
  repo_url?: string;
  capabilities: string[];
}

class AgentRegistry {
  private agents: Record<string, AgentConfig> = {};
  constructor() { this.bootstrapCore(); }
  private bootstrapCore() {
    const cores: AgentConfig[] = [
      { id: 'openclaw', name: 'OpenClaw', source: 'core', role: 'executor', model: 'claude-haiku', prompt: 'Execution routing', enabled: true, risk_level: 'medium', confidence_threshold: 70, capabilities: [] },
      { id: 'mirofish', name: 'Mirofish', source: 'core', role: 'signal', model: 'claude-sonnet', prompt: 'Signal generation', enabled: true, risk_level: 'medium', confidence_threshold: 70, capabilities: [] },
      { id: 'betafish', name: 'Betafish', source: 'core', role: 'arbitrage', model: 'claude-sonnet', prompt: 'Arbitrage', enabled: true, risk_level: 'medium', confidence_threshold: 70, capabilities: [] },
      { id: 'onyx', name: 'Onyx', source: 'core', role: 'research', model: 'claude-opus', prompt: 'Research', enabled: true, risk_level: 'high', confidence_threshold: 70, capabilities: [] }
    ];
    cores.forEach(a => this.agents[a.id] = a);
  }
  public register(agent: AgentConfig) { this.agents[agent.id] = agent; }
  public getAll() { return Object.values(this.agents); }
}

const registry = new AgentRegistry();

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  // API Routes
  app.get('/api/agents', (req, res) => res.json(registry.getAll()));

  app.post('/api/agents/add/repo', async (req, res) => {
    const { repo_url, name, role, confidence_threshold } = req.body;
    
    // PolicyGuard: %70 Trust Threshold check
    const threshold = confidence_threshold || 0;
    if (threshold < 70) {
      return res.status(403).json({ 
        status: 'rejected', 
        reason: 'PolicyGuard: Confidence threshold below 70%',
        threshold_required: 70,
        current_threshold: threshold
      });
    }

    try {
      console.log(`[RepoInstaller] Cloning ${repo_url} to /opt/pouls/plugins/${name}...`);
      // Simulate real cloning delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newAgent: AgentConfig = {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: name,
        repo_url: repo_url,
        source: 'plugin',
        role: role || 'worker',
        model: 'custom',
        prompt: `Orchestrated via crewAI from ${repo_url}`,
        enabled: true,
        risk_level: 'medium',
        confidence_threshold: threshold,
        capabilities: ['multi-agent-automation', 'orchestration']
      };

      registry.register(newAgent);
      
      res.json({ 
        status: 'success', 
        message: `Plugin ${name} integrated successfully via repo_installer.`,
        agent: newAgent 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;
    try {
      const lastMessage = messages[messages.length - 1].content.toLowerCase();
      
      // Simulate OpenClaw + CrewAI responses based on user input
      let responseText = "";
      
      if (lastMessage.includes("boot") || lastMessage.includes("rapor")) {
        responseText = "[OpenClaw: SYS_READY] CrewAI entegrasyonu aktif. Ajanlar komut bekliyor. OpenClaw ve CrewAI senkronize çalışıyor. Tüm sistemler normal.\nSisteme hangi ajanları yöneteceğimi veya hangi hedefe odaklanacağımızı belirtebilirsin.";
      } else if (lastMessage.includes("crew") || lastMessage.includes("open claw")) {
        responseText = "[CrewAI Orchestrator] OpenClaw ile iletişim kuruldu.\n👉 Görev ataması OpenClaw tarafından alındı, alt işleyicilere (Onyx, Mirofish vb.) CrewAI üzerinden dağıtımı yapılıyor. Durum raporu:\n- OpenClaw: Yönlendirici aktif.\n- CrewAI: Ajan sırası yönetiliyor.\nKomutları işliyoruz.";
      } else if (lastMessage.includes("durum") || lastMessage.includes("status")) {
        responseText = "[System Report] OpenClaw + CrewAI Aktif.\n- Ağlantı: Güvenli.\n- Sinyaller: Taranıyor.\n- Ajan Durumu: Otonom modda.";
      } else {
        responseText = `[OpenClaw + CrewAI] Anlaşıldı eylem başlatılıyor: /${messages[messages.length - 1].content}/\nAjanlar (Onyx, Mirofish) CrewAI üzerinden paralel analize başladı. Lütfen sonuçları takip edin.`;
      }
      
      // Add slight delay to simulate agent 'thinking'
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      res.json({ content: [{ text: responseText }] });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ error: String(error.message) });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`POULS Server running on http://localhost:${PORT}`));
}
startServer();
