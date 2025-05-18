import React, { useEffect, useRef, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Card } from '../models/Card';
import { Deck } from '../models/Deck';
import * as d3 from 'd3';
import './KnowledgeGraph.css';

type GraphNode = d3.SimulationNodeDatum & {
  id: string;
  name: string;
  type: 'deck' | 'card' | 'tag';
  value: number; // Size of node
  mastery?: number; // 0-100 for mastery level
  deckId?: string;
};

type GraphLink = d3.SimulationLinkDatum<GraphNode> & {
  // source and target will be string IDs initially, D3 will populate them with GraphNode objects
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'card-deck' | 'card-tag' | 'related';
  strength: number;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

interface KnowledgeGraphProps {
  selectedDeckId?: string;
  width?: number;
  height?: number;
  onSelectNode?: (nodeId: string, nodeType: string) => void;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  selectedDeckId,
  width = 800,
  height = 600,
  onSelectNode
}) => {
  const { cards, decks, calculateDeckMastery } = useData();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ content: string; x: number; y: number } | null>(null);

  // Extract and prepare graph data from cards and decks
  useEffect(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const tagMap: Record<string, boolean> = {};
    
    // Add decks as nodes
    let filteredDecks = selectedDeckId 
      ? decks.filter(d => d.id === selectedDeckId)
      : decks;
    
    filteredDecks.forEach(deck => {
      const deckMastery = calculateDeckMastery(deck.id);
      nodes.push({
        id: deck.id,
        name: deck.name,
        type: 'deck',
        value: 10,
        mastery: deckMastery
      });
    });
    
    // Add cards as nodes and connect to decks
    let filteredCards = selectedDeckId 
      ? cards.filter(c => c.deckId === selectedDeckId) 
      : cards;
    
    filteredCards.forEach(card => {
      // Skip cards with no tags or connections if we're not filtering by deck
      if (!selectedDeckId && (!card.tags || card.tags.length === 0) && !card.relatedCardIds) {
        return;
      }
      
      // Calculate card mastery based on ease factor (normalized to 0-100)
      const cardMastery = Math.min(100, Math.max(0, ((card.scheduling.easeFactor - 1.3) / 1.2) * 100));
      
      nodes.push({
        id: card.id,
        name: truncateText(stripHtml(card.front), 30),
        type: 'card',
        value: 5,
        mastery: cardMastery,
        deckId: card.deckId
      });
      
      // Connect card to its deck
      if (filteredDecks.some(d => d.id === card.deckId)) {
        links.push({
          source: card.id,
          target: card.deckId,
          type: 'card-deck',
          strength: 0.5
        });
      }
      
      // Add tags as nodes and connect cards to tags
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach(tag => {
          const tagId = `tag-${tag}`;
          if (!tagMap[tagId]) {
            nodes.push({
              id: tagId,
              name: tag,
              type: 'tag',
              value: 7
            });
            tagMap[tagId] = true;
          }
          
          links.push({
            source: card.id,
            target: tagId,
            type: 'card-tag',
            strength: 0.3
          });
        });
      }
      
      // Connect related cards
      if (card.relatedCardIds) {
        card.relatedCardIds.forEach(relatedId => {
          if (filteredCards.some(c => c.id === relatedId)) {
            links.push({
              source: card.id,
              target: relatedId,
              type: 'related',
              strength: 0.8
            });
          }
        });
      }
    });
    
    setGraphData({ nodes, links });
  }, [cards, decks, selectedDeckId, calculateDeckMastery]);

  // Initialize and update the graph visualization using D3
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();
    
    const svg = d3.select(svgRef.current);
    
    // Create container group with zoom behavior
    const g = svg.append("g");
    
    // Add zoom and pan behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    
    svg.call(zoom);
    
    // Optional: Center the graph initially
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8));
    
    // Create a force simulation
    const simulation = d3.forceSimulation<GraphNode>(graphData.nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(graphData.links)
        .id(d => d.id)
        .distance(d => 100 / (d.strength || 0.5))
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(0, 0))
      .force("collide", d3.forceCollide().radius(d => (d as any).value * 2));
    
    // Draw links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(graphData.links)
      .enter()
      .append("line")
      .attr("class", d => `link ${d.type}`)
      .attr("stroke-width", d => d.strength * 2);
    
    // Draw nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(graphData.nodes)
      .enter()
      .append("g")
      .attr("class", d => `node ${d.type} ${d.id === selectedNode ? 'selected' : ''}`)
      .on("click", (event, d) => {
        setSelectedNode(d.id === selectedNode ? null : d.id);
        if (onSelectNode) {
          onSelectNode(d.id, d.type);
        }
        event.stopPropagation();
      })
      .on("mouseover", (event, d) => {
        setHoverInfo({
          content: getNodeInfo(d),
          x: event.pageX,
          y: event.pageY
        });
      })
      .on("mouseout", () => {
        setHoverInfo(null);
      })
      .call(d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );
    
    // Add circles to nodes with different styles based on type
    node.append("circle")
      .attr("r", d => d.value)
      .attr("fill", d => {
        if (d.type === 'deck') {
          return getMasteryColor(d.mastery || 0);
        } else if (d.type === 'card') {
          return getMasteryColor(d.mastery || 0, 0.7);
        } else {
          return "#FFC107"; // Tag color
        }
      })
      .attr("stroke", d => d.id === selectedNode ? "#FF5722" : "#fff")
      .attr("stroke-width", d => d.id === selectedNode ? 3 : 1);
    
    // Add labels to nodes
    node.append("text")
      .text(d => d.name)
      .attr("x", d => d.value + 5)
      .attr("y", 4)
      .attr("class", "node-label");
    
    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as any).x)
        .attr("y1", d => (d.source as any).y)
        .attr("x2", d => (d.target as any).x)
        .attr("y2", d => (d.target as any).y);
        
      node.attr("transform", d => `translate(${(d as any).x},${(d as any).y})`);
    });
    
    // Clean up on unmount
    return () => {
      simulation.stop();
    };
  }, [graphData, selectedNode, width, height, onSelectNode]);

  // Get detailed info for the hover tooltip
  const getNodeInfo = (node: GraphNode): string => {
    switch (node.type) {
      case 'deck':
        return `Deck: ${node.name}\nMastery: ${Math.round(node.mastery || 0)}%\nCards: ${cards.filter(c => c.deckId === node.id).length}`;
      case 'card':
        const card = cards.find(c => c.id === node.id);
        return `Card: ${node.name}\nMastery: ${Math.round(node.mastery || 0)}%\nDeck: ${decks.find(d => d.id === node.deckId)?.name || 'Unknown'}`;
      case 'tag':
        const taggedCards = cards.filter(c => c.tags?.includes(node.name.replace('tag-', ''))).length;
        return `Tag: ${node.name}\nCards: ${taggedCards}`;
      default:
        return node.name;
    }
  };
  
  // Helper function to get color based on mastery level
  const getMasteryColor = (mastery: number, opacity: number = 1): string => {
    if (mastery >= 80) {
      return `rgba(76, 175, 80, ${opacity})`; // Green for high mastery
    } else if (mastery >= 50) {
      return `rgba(33, 150, 243, ${opacity})`; // Blue for medium mastery
    } else if (mastery >= 30) {
      return `rgba(255, 193, 7, ${opacity})`; // Amber for low mastery
    } else {
      return `rgba(244, 67, 54, ${opacity})`; // Red for very low mastery
    }
  };
  
  // Helper to strip HTML from card text
  const stripHtml = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };
  
  // Helper to truncate text
  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // If no data, show empty state
  if (graphData.nodes.length === 0) {
    return (
      <div className="knowledge-graph-empty">
        <h3>No connected knowledge yet</h3>
        <p>Add tags to your cards or create relationships between them to see your knowledge graph</p>
      </div>
    );
  }

  return (
    <div className="knowledge-graph-container">
      <div className="graph-controls">
        <div className="graph-legend">
          <h3>Knowledge Graph</h3>
          <div className="legend-item">
            <span className="legend-icon deck"></span>
            <span>Decks</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon card"></span>
            <span>Cards</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon tag"></span>
            <span>Tags</span>
          </div>
        </div>
      </div>
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="knowledge-graph-svg"
        onClick={() => setSelectedNode(null)}
      />
      
      {hoverInfo && (
        <div 
          className="node-tooltip"
          style={{
            position: 'absolute',
            left: `${hoverInfo.x + 10}px`,
            top: `${hoverInfo.y + 10}px`
          }}
        >
          {hoverInfo.content.split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
      
      {selectedNode && (
        <div className="node-detail-panel">
          <h3>Selected Node</h3>
          <div className="node-detail-content">
            {(() => {
              const node = graphData.nodes.find(n => n.id === selectedNode);
              if (!node) return null;
              
              if (node.type === 'deck') {
                const deckCards = cards.filter(c => c.deckId === node.id);
                return (
                  <div>
                    <h4>{node.name}</h4>
                    <p>Cards: {deckCards.length}</p>
                    <p>Mastery: {Math.round(node.mastery || 0)}%</p>
                    <div className="mastery-bar">
                      <div 
                        className="mastery-fill"
                        style={{ width: `${node.mastery || 0}%`, background: getMasteryColor(node.mastery || 0) }}
                      ></div>
                    </div>
                  </div>
                );
              } else if (node.type === 'card') {
                const card = cards.find(c => c.id === node.id);
                return (
                  <div>
                    <h4>Card</h4>
                    <div className="card-front">{stripHtml(card?.front || '')}</div>
                    <p>Mastery: {Math.round(node.mastery || 0)}%</p>
                    <div className="mastery-bar">
                      <div 
                        className="mastery-fill"
                        style={{ width: `${node.mastery || 0}%`, background: getMasteryColor(node.mastery || 0) }}
                      ></div>
                    </div>
                  </div>
                );
              } else {
                const tagName = node.name;
                const taggedCards = cards.filter(c => c.tags?.includes(tagName));
                return (
                  <div>
                    <h4>Tag: {tagName}</h4>
                    <p>Cards with this tag: {taggedCards.length}</p>
                    <ul className="tagged-cards-list">
                      {taggedCards.slice(0, 5).map(card => (
                        <li key={card.id}>
                          {truncateText(stripHtml(card.front), 40)}
                        </li>
                      ))}
                      {taggedCards.length > 5 && <li>+{taggedCards.length - 5} more</li>}
                    </ul>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraph; 