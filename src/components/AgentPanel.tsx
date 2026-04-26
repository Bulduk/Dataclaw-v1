import React from 'react';
import { Card, SectionTitle, Btn, Toggle } from './ui-blocks'; // Assuming these exist or we just use divs
import { usePersistentStore } from '../state/persistentStore';

export default function AgentPanel() {
  const { agents, updateAgent } = usePersistentStore();

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 'bold' }}>🤖 Agent Swarm Config</div>
      
      {agents.map(agent => (
        <div key={agent.id} style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{agent.name}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Role: {agent.role}</div>
            </div>
            {/* Toggle switch placeholder */}
            <div 
              style={{ padding: '4px 12px', borderRadius: '12px', background: agent.enabled ? 'rgba(0,255,0,0.2)' : 'rgba(255,0,0,0.2)', cursor: 'pointer' }}
              onClick={() => updateAgent(agent.id, { enabled: !agent.enabled })}
            >
              {agent.enabled ? 'ACTIVE' : 'INACTIVE'}
            </div>
          </div>
          
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Confidence Threshold: {agent.confidenceThreshold}%</label>
            <input 
              type="range" 
              min="0" max="100" 
              value={agent.confidenceThreshold}
              onChange={(e) => updateAgent(agent.id, { confidenceThreshold: parseInt(e.target.value) })}
              style={{ width: '100%', marginTop: '4px' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
