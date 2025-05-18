import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import './KnowledgeGraphPage.css';

// Basic Force-directed graph visualization 
// In a real implementation, you would use a library like D3.js or vis.js
const KnowledgeGraphPage: React.FC = () => {
  const { deckId } = useParams<{ deckId?: string }>();
  const { cards, decks, getDeckById } = useData();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(true);
  
  // Get cards for the visualization
  const graphCards = deckId 
    ? cards.filter(card => card.deckId === deckId)
    : cards;
  
  const deckName = deckId 
    ? getDeckById(deckId)?.name || 'Unknown Deck' 
    : 'All Decks';
  
  // Create nodes and links
  const nodes = graphCards.map(card => ({
    id: card.id,
    label: card.front.substring(0, 30) + (card.front.length > 30 ? '...' : ''),
    radius: 20 + Math.min(card.reviewHistory?.length || 0, 10) * 2, // Larger nodes for more reviewed cards
    color: getColorForCard(card),
    x: Math.random() * window.innerWidth * 0.8,
    y: Math.random() * window.innerHeight * 0.7,
    vx: 0,
    vy: 0
  }));
  
  // Create links based on tag relationships and deck relationships
  const links: { source: string; target: string; strength: number }[] = [];
  
  // Connect cards with similar tags
  graphCards.forEach((card1, i) => {
    if (!card1.tags || card1.tags.length === 0) return;
    
    graphCards.forEach((card2, j) => {
      if (i >= j || !card2.tags || card2.tags.length === 0) return;
      
      // Find common tags
      const commonTags = card1.tags?.filter(tag => card2.tags?.includes(tag)) || [];
      if (commonTags.length > 0) {
        links.push({
          source: card1.id,
          target: card2.id,
          strength: 0.5 + (commonTags.length / 10) // Stronger links for more shared tags
        });
      }
    });
  });
  
  // Connect cards in sequence if they were created close together
  graphCards
    .filter(card => card.deckId === deckId) // Only for the same deck
    .sort((a, b) => 
      new Date(a.created || '').getTime() - new Date(b.created || '').getTime()
    )
    .forEach((card, i, arr) => {
      if (i < arr.length - 1) {
        const nextCard = arr[i + 1];
        const timeDiff = Math.abs(
          new Date(nextCard.created || '').getTime() - 
          new Date(card.created || '').getTime()
        );
        
        // If cards were created within 1 hour of each other
        if (timeDiff < 3600000) {
          links.push({
            source: card.id,
            target: nextCard.id,
            strength: 0.3
          });
        }
      }
    });
  
  // Simulate force-directed graph
  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvasRef.current.width = canvasRef.current.clientWidth;
    canvasRef.current.height = canvasRef.current.clientHeight;
    
    let animationId: number;
    
    // Animation loop
    const simulate = () => {
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      
      // Draw links
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.2)';
      ctx.lineWidth = 1;
      
      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }
      });
      
      // Draw nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.fillStyle = node.id === selectedNode 
          ? '#ff7750' // Highlight selected node
          : node.color;
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw node labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + node.radius + 15);
      });
      
      // Apply forces if simulation is running
      if (simulationRunning) {
        applyForces();
      }
      
      animationId = requestAnimationFrame(simulate);
    };
    
    const applyForces = () => {
      // Apply forces between nodes (repulsion)
      nodes.forEach(node1 => {
        nodes.forEach(node2 => {
          if (node1 === node2) return;
          
          const dx = node2.x - node1.x;
          const dy = node2.y - node1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = node1.radius + node2.radius + 70;
          
          if (distance < minDistance) {
            const force = (minDistance - distance) / distance * 0.05;
            node1.vx -= dx * force;
            node1.vy -= dy * force;
            node2.vx += dx * force;
            node2.vy += dy * force;
          }
        });
      });
      
      // Apply forces from links (attraction)
      links.forEach(link => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const force = distance * 0.001 * link.strength;
          
          sourceNode.vx += dx * force;
          sourceNode.vy += dy * force;
          targetNode.vx -= dx * force;
          targetNode.vy -= dy * force;
        }
      });
      
      // Center force
      const centerX = canvasRef.current!.width / 2;
      const centerY = canvasRef.current!.height / 2;
      
      nodes.forEach(node => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 200) {
          const force = distance * 0.0001;
          node.vx += dx * force;
          node.vy += dy * force;
        }
        
        // Update positions
        node.x += node.vx;
        node.y += node.vy;
        
        // Damping
        node.vx *= 0.9;
        node.vy *= 0.9;
        
        // Boundary constraints
        const margin = node.radius + 10;
        if (node.x < margin) node.x = margin;
        if (node.y < margin) node.y = margin;
        if (node.x > canvasRef.current!.width - margin) node.x = canvasRef.current!.width - margin;
        if (node.y > canvasRef.current!.height - margin) node.y = canvasRef.current!.height - margin;
      });
    };
    
    // Handle canvas click
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check if clicked on a node
      const clickedNode = nodes.find(node => {
        const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
        return distance <= node.radius;
      });
      
      if (clickedNode) {
        setSelectedNode(clickedNode.id === selectedNode ? null : clickedNode.id);
      } else {
        setSelectedNode(null);
      }
    };
    
    // Start simulation
    simulate();
    
    // Add event listener
    canvasRef.current.addEventListener('click', handleCanvasClick);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      canvasRef.current?.removeEventListener('click', handleCanvasClick);
    };
  }, [nodes, links, selectedNode, simulationRunning]);
  
  // Color based on card learning stage and ease factor
  function getColorForCard(card: any) {
    if (!card.scheduling) return '#cccccc';
    
    switch (card.scheduling.learningStage) {
      case 'learning':
        return '#ff9c7e'; // Light version of accent color
      case 'review':
        // Color based on ease factor, green for high, blue for medium
        return card.scheduling.easeFactor > 2.2 ? '#42B883' : '#3A7BDE';
      case 'relearning':
        return '#FFC107'; // Warning/amber color
      default:
        return '#cccccc';
    }
  }
  
  const selectedCard = selectedNode 
    ? cards.find(card => card.id === selectedNode) 
    : null;
  
  return (
    <div className="knowledge-graph-page">
      <div className="graph-header">
        <h1>Knowledge Graph: {deckName}</h1>
        <div className="graph-controls">
          <button 
            className={`toggle-simulation ${simulationRunning ? 'active' : ''}`}
            onClick={() => setSimulationRunning(!simulationRunning)}
          >
            {simulationRunning ? 'Pause Simulation' : 'Resume Simulation'}
          </button>
        </div>
      </div>
      
      <div className="graph-container">
        <canvas 
          ref={canvasRef} 
          className="graph-canvas"
        ></canvas>
        
        {selectedCard && (
          <div className="selected-card-details">
            <h3>Selected Card</h3>
            <div className="card-preview">
              <div className="card-front">{selectedCard.front}</div>
              <div className="card-back">{selectedCard.back}</div>
            </div>
            <div className="card-meta">
              <div>Created: {new Date(selectedCard.created || '').toLocaleDateString()}</div>
              <div>Reviews: {selectedCard.reviewHistory?.length || 0}</div>
              {selectedCard.tags && selectedCard.tags.length > 0 && (
                <div className="card-tags">
                  Tags: {selectedCard.tags.join(', ')}
                </div>
              )}
            </div>
            <Link to={`/edit-card/${selectedCard.id}`} className="btn btn-primary">
              Edit Card
            </Link>
          </div>
        )}
      </div>
      
      <div className="graph-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ff9c7e' }}></div>
          <div className="legend-label">Learning</div>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#3A7BDE' }}></div>
          <div className="legend-label">Reviewing</div>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#42B883' }}></div>
          <div className="legend-label">Well Known</div>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFC107' }}></div>
          <div className="legend-label">Relearning</div>
        </div>
      </div>
      
      <div className="graph-help">
        <p>This visualization shows connections between your flashcards. 
           Cards with similar tags are connected. Larger nodes represent cards 
           you've reviewed more frequently.</p>
        <p>Click on any node to see card details.</p>
      </div>
    </div>
  );
};

export default KnowledgeGraphPage; 