import React, { useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Connection,
  Panel,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '../models/Card';
import './KnowledgeGraph.css';

// Define tag colors for visual consistency
const TAG_COLORS = [
  '#E57373', '#81C784', '#64B5F6', '#FFD54F', '#BA68C8', 
  '#4DB6AC', '#FF8A65', '#90A4AE', '#A1887F', '#7986CB'
];

// Group tag families for concept clusters
const TAG_FAMILIES: { [key: string]: string[] } = {
  'Languages': ['javascript', 'typescript', 'python', 'java', 'cpp', 'c#', 'rust', 'go', 'programming'],
  'Web Development': ['html', 'css', 'react', 'vue', 'angular', 'frontend', 'backend', 'web', 'responsive'],
  'Science': ['physics', 'chemistry', 'biology', 'astronomy', 'science'],
  'Math': ['algebra', 'calculus', 'statistics', 'probability', 'geometry', 'mathematics', 'math'],
  'History': ['history', 'ancient', 'medieval', 'renaissance', 'modern', 'dates'],
  'Geography': ['geography', 'countries', 'capitals', 'maps', 'continents'],
  'Languages & Linguistics': ['grammar', 'vocabulary', 'pronunciation', 'language', 'english', 'spanish', 'french', 'german'],
  'Computer Science': ['algorithms', 'data structures', 'complexity', 'computer science', 'cs', 'coding'],
  'Medicine': ['anatomy', 'physiology', 'pathology', 'medicine', 'healthcare'],
};

type KnowledgeGraphProps = {
  cards: Card[];
  onAddRelationship?: (sourceId: string, targetId: string) => void;
  onRemoveRelationship?: (sourceId: string, targetId: string) => void;
  onNodeClick?: (cardId: string) => void;
  selectedCardId?: string | null;
  readOnly?: boolean;
};

// Find tag family for a given tag
const getTagFamily = (tag: string): string => {
  const normalizedTag = tag.toLowerCase();
  for (const [family, tags] of Object.entries(TAG_FAMILIES)) {
    if (tags.some(t => normalizedTag.includes(t) || t.includes(normalizedTag))) {
      return family;
    }
  }
  return 'Other';
};

// Helper to determine a card's mastery level for styling
const getCardStrength = (card: Card): 'strong' | 'medium' | 'weak' => {
  const { easeFactor, learningStage } = card.scheduling;
  if (learningStage === 'relearning' || easeFactor < 1.8) return 'weak';
  if (learningStage === 'learning' || easeFactor < 2.2) return 'medium';
  return 'strong';
};

// Get consistent color for a tag
const getTagColor = (tagName: string, tagColorMap: Map<string, string>): string => {
  if (!tagColorMap.has(tagName)) {
    // If the tag is part of a family, use a consistent color for all tags in that family
    const family = getTagFamily(tagName);
    if (family !== 'Other' && !tagColorMap.has(family)) {
      tagColorMap.set(family, TAG_COLORS[tagColorMap.size % TAG_COLORS.length]);
    }
    
    // Use the family color or assign a new one
    if (family !== 'Other') {
      tagColorMap.set(tagName, tagColorMap.get(family)!);
    } else {
      tagColorMap.set(tagName, TAG_COLORS[tagColorMap.size % TAG_COLORS.length]);
    }
  }
  return tagColorMap.get(tagName)!;
};

// Get node color based on strength
const getNodeColor = (strength: 'strong' | 'medium' | 'weak'): string => {
  switch (strength) {
    case 'strong': return 'var(--easy-color)';
    case 'medium': return 'var(--hard-color)';
    case 'weak': return 'var(--again-color)';
    default: return 'var(--primary-color)';
  }
};

// Calculate similarity between two cards based on tags
const calculateTagSimilarity = (card1: Card, card2: Card): number => {
  if (!card1.tags?.length || !card2.tags?.length) return 0;
  
  const tags1 = card1.tags.map(t => t.toLowerCase());
  const tags2 = card2.tags.map(t => t.toLowerCase());
  
  // Count matching tags
  const commonTags = tags1.filter(tag => tags2.includes(tag));
  
  // Calculate Jaccard similarity: |A ∩ B| / |A ∪ B|
  const unionSize = new Set([...tags1, ...tags2]).size;
  return commonTags.length / unionSize;
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  cards,
  onAddRelationship,
  onRemoveRelationship,
  onNodeClick,
  selectedCardId,
  readOnly = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [tagColorMap, setTagColorMap] = useState<Map<string, string>>(new Map());
  const [highlightedTags, setHighlightedTags] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [filterByStrength, setFilterByStrength] = useState<'all' | 'weak' | 'medium' | 'strong'>('all');
  const [useForceLayout, setUseForceLayout] = useState(true);
  const [showConceptClusters, setShowConceptClusters] = useState(true);
  const [autoDetectRelations, setAutoDetectRelations] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.3);
  const [layoutSpacing, setLayoutSpacing] = useState(150);
  
  // Extract all unique tags for filtering
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    cards.forEach(card => {
      if (card.tags) {
        card.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [cards]);
  
  // Group tags by family
  const tagFamilies = useMemo(() => {
    const families: { [key: string]: string[] } = {};
    
    allTags.forEach(tag => {
      const family = getTagFamily(tag);
      if (!families[family]) {
        families[family] = [];
      }
      families[family].push(tag);
    });
    
    return families;
  }, [allTags]);

  // Auto-detect related cards based on tags
  const autoDetectRelatedCards = (inputCards: Card[]): Card[] => {
    if (!autoDetectRelations) return inputCards;
    
    const updatedCards = [...inputCards];
    
    // Create a map of related IDs to track changes
    const relationUpdates: { [cardId: string]: string[] } = {};
    
    // Calculate similarities and update related IDs
    for (let i = 0; i < updatedCards.length; i++) {
      const card1 = updatedCards[i];
      if (!relationUpdates[card1.id]) {
        relationUpdates[card1.id] = [...(card1.relatedIds || [])];
      }
      
      for (let j = i + 1; j < updatedCards.length; j++) {
        const card2 = updatedCards[j];
        if (!relationUpdates[card2.id]) {
          relationUpdates[card2.id] = [...(card2.relatedIds || [])];
        }
        
        const similarity = calculateTagSimilarity(card1, card2);
        
        // If cards are similar but not already related, add the relationship
        if (similarity >= similarityThreshold) {
          if (!relationUpdates[card1.id].includes(card2.id)) {
            relationUpdates[card1.id].push(card2.id);
          }
          
          if (!relationUpdates[card2.id].includes(card1.id)) {
            relationUpdates[card2.id].push(card1.id);
          }
        }
      }
    }
    
    // Apply the relation updates to cards
    return updatedCards.map(card => ({
      ...card,
      relatedIds: relationUpdates[card.id] || card.relatedIds || []
    }));
  };

  // Apply force-directed layout to position nodes
  const applyForceLayout = (nodes: Node[], edges: Edge[], spacing: number = 100): Node[] => {
    if (!useForceLayout || nodes.length === 0) return nodes;
    
    // Simple force-directed layout algorithm
    const iterations = 50;
    const updatedNodes = [...nodes];
    
    // Create a map of nodes by id for faster lookup
    const nodeMap: { [key: string]: number } = {};
    updatedNodes.forEach((node, index) => {
      nodeMap[node.id] = index;
    });
    
    // Define forces
    const repulsiveForce = (distance: number) => spacing * spacing / Math.max(distance, 1);
    const attractiveForce = (distance: number) => distance * distance / (spacing * 10);
    
    // Get tag families for nodes
    const nodeFamilies: { [nodeId: string]: string } = {};
    updatedNodes.forEach(node => {
      const tags = node.data.tags || [];
      if (tags.length > 0) {
        const primaryTag = tags[0];
        nodeFamilies[node.id] = getTagFamily(primaryTag);
      } else {
        nodeFamilies[node.id] = 'Other';
      }
    });
    
    // Run the layout algorithm
    for (let i = 0; i < iterations; i++) {
      // Calculate repulsive forces (node-node)
      for (let j = 0; j < updatedNodes.length; j++) {
        for (let k = j + 1; k < updatedNodes.length; k++) {
          const node1 = updatedNodes[j];
          const node2 = updatedNodes[k];
          
          const dx = node2.position.x - node1.position.x;
          const dy = node2.position.y - node1.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Apply family-based clustering force
          let familyMultiplier = 1.0;
          if (showConceptClusters && nodeFamilies[node1.id] === nodeFamilies[node2.id]) {
            // Nodes in same family have weaker repulsion
            familyMultiplier = 0.3;
          }
          
          if (distance > 0) {
            const force = repulsiveForce(distance) * familyMultiplier;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            updatedNodes[j].position.x -= fx;
            updatedNodes[j].position.y -= fy;
            updatedNodes[k].position.x += fx;
            updatedNodes[k].position.y += fy;
          }
        }
      }
      
      // Calculate attractive forces (edges)
      for (const edge of edges) {
        const sourceIndex = nodeMap[edge.source];
        const targetIndex = nodeMap[edge.target];
        
        if (sourceIndex !== undefined && targetIndex !== undefined) {
          const sourceNode = updatedNodes[sourceIndex];
          const targetNode = updatedNodes[targetIndex];
          
          const dx = targetNode.position.x - sourceNode.position.x;
          const dy = targetNode.position.y - sourceNode.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 0) {
            const force = attractiveForce(distance);
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            updatedNodes[sourceIndex].position.x += fx;
            updatedNodes[sourceIndex].position.y += fy;
            updatedNodes[targetIndex].position.x -= fx;
            updatedNodes[targetIndex].position.y -= fy;
          }
        }
      }
    }
    
    return updatedNodes;
  };

  // Build graph nodes and edges
  useEffect(() => {
    // Apply filters before creating nodes
    const filteredCards = cards.filter(card => {
      // Filter by card strength if applicable
      if (filterByStrength !== 'all') {
        const cardStrength = getCardStrength(card);
        if (cardStrength !== filterByStrength) return false;
      }
      
      // Filter by tags if applicable
      if (filteredTags.length > 0 && (!card.tags || !card.tags.some(tag => filteredTags.includes(tag)))) {
        return false;
      }
      
      return true;
    });
    
    // Auto-detect relations if enabled
    const processedCards = autoDetectRelations ? autoDetectRelatedCards(filteredCards) : filteredCards;
    
    const tagMap = new Map<string, string>();

    // Create nodes from filtered cards
    const graphNodes: Node[] = processedCards.map((card, index) => {
      const strength = getCardStrength(card);
      let primaryTag = '';
      let conceptCluster = 'Other';
      
      // Set border color based on primary tag if available
      let borderColor = getNodeColor(strength);
      if (card.tags && card.tags.length > 0) {
        primaryTag = card.tags[0];
        conceptCluster = getTagFamily(primaryTag);
        borderColor = getTagColor(primaryTag, tagMap);
      }
      
      // Highlight if card is selected
      const isSelected = card.id === selectedCardId;
      
      // Extract clean content for display
      const cleanedFront = card.front.replace(/<[^>]+>/g, '').slice(0, 30) + 
        (card.front.length > 30 ? '...' : '');
      
      // Style based on review status and concept cluster
      const nodeStyle = {
        background: strength === 'weak' ? 'var(--again-color)' : 
                    strength === 'medium' ? 'var(--hard-color)' : 
                    'var(--easy-color)',
        color: strength === 'medium' ? '#333' : '#fff',
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '10px',
        fontSize: '12px',
        width: 160,
        boxShadow: isSelected ? '0 0 0 3px var(--primary-color)' : 'none',
      };
      
      // Position nodes in a circle initially (will be repositioned by force layout if enabled)
      const radius = Math.min(600, 150 + processedCards.length * 15);
      const angle = (index * 2 * Math.PI) / processedCards.length;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);
      
      return {
        id: card.id,
        data: { 
          label: cleanedFront,
          tags: card.tags || [],
          stage: card.scheduling.learningStage,
          easeFactor: card.scheduling.easeFactor,
          strength,
          conceptCluster,
        },
        position: { x, y },
        style: nodeStyle,
      };
    });
    
    // Create edges for relationships
    const graphEdges: Edge[] = [];
    
    // First, add prerequisite relationships
    processedCards.forEach(card => {
      if (card.prerequisiteCardIds && card.prerequisiteCardIds.length > 0) {
        card.prerequisiteCardIds.forEach(prereqId => {
          if (graphNodes.some(node => node.id === prereqId)) {
            graphEdges.push({
              id: `p-${prereqId}-${card.id}`,
              source: prereqId,
              target: card.id,
              type: 'smoothstep',
              animated: false,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: 'var(--accent-color)',
              },
              style: {
                strokeWidth: 2,
                stroke: 'var(--accent-color)',
              },
              label: 'prerequisite',
              labelStyle: { fill: 'var(--accent-color)', fontSize: 10 },
              data: { 
                type: 'prerequisite',
                sourceCard: processedCards.find(c => c.id === prereqId),
                targetCard: card,
              }
            });
          }
        });
      }
    });
    
    // Then add general relationship edges
    processedCards.forEach(card => {
      if (card.relatedIds && card.relatedIds.length > 0) {
        card.relatedIds.forEach(relId => {
          if (graphNodes.some(node => node.id === relId)) {
            // Check if a prerequisite relationship already exists
            const prereqExists = graphEdges.some(
              edge => (edge.source === card.id && edge.target === relId) ||
                     (edge.source === relId && edge.target === card.id)
            );
            
            if (!prereqExists) {
              // Check if this is an auto-detected relationship
              const sourceCard = processedCards.find(c => c.id === card.id);
              const targetCard = processedCards.find(c => c.id === relId);
              const isAutoDetected = autoDetectRelations && 
                sourceCard?.tags?.length && 
                targetCard?.tags?.length && 
                !cards.find(c => c.id === card.id)?.relatedIds?.includes(relId);
                
              graphEdges.push({
                id: `r-${card.id}-${relId}`,
                source: card.id,
                target: relId,
                type: 'straight',
                animated: false,
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 15,
                  height: 15,
                  color: isAutoDetected ? 'var(--secondary-color)' : 'var(--primary-color)',
                },
                style: {
                  strokeWidth: 1.5,
                  stroke: isAutoDetected ? 'var(--secondary-color)' : 'var(--primary-color)',
                  strokeDasharray: isAutoDetected ? '5,5' : undefined,
                },
                label: isAutoDetected ? 'auto-related' : 'related',
                labelStyle: { 
                  fill: isAutoDetected ? 'var(--secondary-color)' : 'var(--primary-color)', 
                  fontSize: 10 
                },
                data: { 
                  type: 'related',
                  isAutoDetected,
                  sourceCard: card,
                  targetCard: processedCards.find(c => c.id === relId),
                }
              });
            }
          }
        });
      }
    });
    
    // Apply force-directed layout if enabled
    const layoutedNodes = applyForceLayout(graphNodes, graphEdges, layoutSpacing);
    
    setTagColorMap(tagMap);
    setNodes(layoutedNodes);
    setEdges(graphEdges);
  }, [
    cards, 
    selectedCardId, 
    filteredTags, 
    filterByStrength, 
    setNodes, 
    setEdges, 
    useForceLayout, 
    showConceptClusters, 
    autoDetectRelations,
    similarityThreshold,
    layoutSpacing
  ]);
  
  // Handle node selection
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    
    if (onNodeClick) {
      onNodeClick(node.id);
    }
    
    // If connecting, establish relationship
    if (isConnecting && connectionSource && connectionSource !== node.id) {
      if (onAddRelationship) {
        onAddRelationship(connectionSource, node.id);
      }
      // Reset connection state
      setIsConnecting(false);
      setConnectionSource(null);
    }
  };
  
  // Handle starting a connection
  const handleStartConnection = (nodeId: string) => {
    setIsConnecting(true);
    setConnectionSource(nodeId);
  };
  
  // Handle connecting nodes via edge creation
  const handleConnect = (connection: Connection) => {
    if (connection.source && connection.target && onAddRelationship) {
      onAddRelationship(connection.source, connection.target);
    }
  };
  
  // Handle removing connections
  const handleEdgeClick = (event: React.MouseEvent, edge: Edge) => {
    if (!readOnly && onRemoveRelationship) {
      const shouldRemove = window.confirm("Remove this relationship?");
      if (shouldRemove && edge.source && edge.target) {
        onRemoveRelationship(edge.source, edge.target);
        // Remove the edge visually
        setEdges(edges => edges.filter(e => e.id !== edge.id));
      }
    }
  };
  
  // Toggle tag filter
  const toggleTagFilter = (tag: string) => {
    setFilteredTags(prevTags => {
      if (prevTags.includes(tag)) {
        return prevTags.filter(t => t !== tag);
      } else {
        return [...prevTags, tag];
      }
    });
  };
  
  // Toggle tag family filter
  const toggleTagFamilyFilter = (family: string, tags: string[]) => {
    setFilteredTags(prevTags => {
      const allFamilyTagsSelected = tags.every(tag => prevTags.includes(tag));
      
      if (allFamilyTagsSelected) {
        // Remove all tags in this family
        return prevTags.filter(tag => !tags.includes(tag));
      } else {
        // Add all tags from this family that aren't already included
        const tagsToAdd = tags.filter(tag => !prevTags.includes(tag));
        return [...prevTags, ...tagsToAdd];
      }
    });
  };
  
  // Handle mouse enter on a node
  const handleMouseEnter = (event: React.MouseEvent, node: Node) => {
    const nodeTags = node.data.tags || [];
    setHighlightedTags(nodeTags);
  };
  
  // Handle mouse leave from a node
  const handleMouseLeave = () => {
    setHighlightedTags([]);
  };
  
  return (
    <div className="knowledge-graph-container">
      <div className="graph-controls">
        <div className="graph-title">
          <h3>Knowledge Graph</h3>
          <div className="control-buttons">
            <button 
              className="filter-toggle"
              onClick={() => setShowFilters(prev => !prev)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button
              className={`layout-toggle ${useForceLayout ? 'active' : ''}`}
              onClick={() => setUseForceLayout(prev => !prev)}
              title="Toggle force-directed layout"
            >
              Smart Layout
            </button>
            <button
              className={`clusters-toggle ${showConceptClusters ? 'active' : ''}`}
              onClick={() => setShowConceptClusters(prev => !prev)}
              title="Group cards by concept clusters"
            >
              Concept Clusters
            </button>
            <button
              className={`auto-relate-toggle ${autoDetectRelations ? 'active' : ''}`}
              onClick={() => setAutoDetectRelations(prev => !prev)}
              title="Auto-detect relationships between cards"
            >
              Auto-Relate
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="graph-filters">
            <div className="filter-section">
              <h4>Filter by Concept Clusters</h4>
              <div className="concept-filters">
                {Object.entries(tagFamilies).map(([family, tags]) => (
                  <div key={family} className="concept-family">
                    <button
                      className={`family-filter ${tags.some(tag => filteredTags.includes(tag)) ? 'active' : ''}`}
                      onClick={() => toggleTagFamilyFilter(family, tags)}
                    >
                      {family} ({tags.length})
                    </button>
                    <div className="family-tags">
                      {tags.slice(0, 3).map(tag => (
                        <span key={tag} className="family-tag-preview">{tag}</span>
                      ))}
                      {tags.length > 3 && <span className="family-tag-more">+{tags.length - 3}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="filter-section">
              <h4>Filter by Tag</h4>
              <div className="tag-filters">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`tag-filter ${filteredTags.includes(tag) ? 'active' : ''}`}
                    style={{
                      borderColor: getTagColor(tag, tagColorMap),
                      backgroundColor: filteredTags.includes(tag) ? getTagColor(tag, tagColorMap) : 'transparent',
                      color: filteredTags.includes(tag) ? '#fff' : getTagColor(tag, tagColorMap),
                    }}
                    onClick={() => toggleTagFilter(tag)}
                  >
                    {tag}
                  </button>
                ))}
                {filteredTags.length > 0 && (
                  <button
                    className="tag-filter clear-filter"
                    onClick={() => setFilteredTags([])}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            
            <div className="filter-section">
              <h4>Filter by Strength</h4>
              <div className="strength-filters">
                <button
                  className={`strength-filter ${filterByStrength === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterByStrength('all')}
                >
                  All Cards
                </button>
                <button
                  className={`strength-filter weak ${filterByStrength === 'weak' ? 'active' : ''}`}
                  onClick={() => setFilterByStrength('weak')}
                >
                  Weak Cards
                </button>
                <button
                  className={`strength-filter medium ${filterByStrength === 'medium' ? 'active' : ''}`}
                  onClick={() => setFilterByStrength('medium')}
                >
                  Medium Cards
                </button>
                <button
                  className={`strength-filter strong ${filterByStrength === 'strong' ? 'active' : ''}`}
                  onClick={() => setFilterByStrength('strong')}
                >
                  Strong Cards
                </button>
              </div>
            </div>
            
            {autoDetectRelations && (
              <div className="filter-section">
                <h4>Auto-Relation Settings</h4>
                <div className="slider-control">
                  <label>Similarity Threshold: {similarityThreshold.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                  />
                  <div className="slider-labels">
                    <span>More Relations</span>
                    <span>Fewer Relations</span>
                  </div>
                </div>
              </div>
            )}
            
            {useForceLayout && (
              <div className="filter-section">
                <h4>Layout Settings</h4>
                <div className="slider-control">
                  <label>Spacing: {layoutSpacing}</label>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="10"
                    value={layoutSpacing}
                    onChange={(e) => setLayoutSpacing(parseInt(e.target.value))}
                  />
                  <div className="slider-labels">
                    <span>Compact</span>
                    <span>Spread Out</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="graph-container">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onConnect={!readOnly ? handleConnect : undefined}
            onNodeMouseEnter={handleMouseEnter}
            onNodeMouseLeave={handleMouseLeave}
            fitView
            attributionPosition="bottom-left"
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <MiniMap 
              nodeStrokeColor={(n) => {
                const node = nodes.find(node => node.id === n.id);
                return node?.style?.border?.toString().split(' ')[2] || '#ccc';
              }}
              nodeColor={(n) => {
                const node = nodes.find(node => node.id === n.id);
                return node?.style?.background as string || '#fff';
              }}
            />
            <Background color="var(--border-color-light)" gap={16} size={1} />
            
            <Panel position="top-right" className="graph-panel">
              <div className="graph-stats">
                <div className="stat-item">
                  <span className="stat-label">Cards:</span>
                  <span className="stat-value">{nodes.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Relationships:</span>
                  <span className="stat-value">{edges.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Concepts:</span>
                  <span className="stat-value">
                    {new Set(nodes.map(n => n.data.conceptCluster)).size}
                  </span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      
      {highlightedTags.length > 0 && (
        <div className="tag-highlights">
          <span className="tag-highlights-label">Tags: </span>
          {highlightedTags.map(tag => (
            <span
              key={tag}
              className="tag-highlight"
              style={{ backgroundColor: getTagColor(tag, tagColorMap) }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="graph-legend">
        <h4>Legend</h4>
        <div className="legend-section">
          <h5>Card Status</h5>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--easy-color)' }}></div>
            <span>Strong Cards (Well Mastered)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--hard-color)' }}></div>
            <span>Medium Cards (Learning)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: 'var(--again-color)' }}></div>
            <span>Weak Cards (Needs Focus)</span>
          </div>
        </div>
        
        <div className="legend-section">
          <h5>Relationships</h5>
          <div className="legend-item">
            <div className="legend-line" style={{ backgroundColor: 'var(--accent-color)' }}></div>
            <span>Prerequisite Relationship</span>
          </div>
          <div className="legend-item">
            <div className="legend-line" style={{ backgroundColor: 'var(--primary-color)' }}></div>
            <span>Manual Relationship</span>
          </div>
          {autoDetectRelations && (
            <div className="legend-item">
              <div className="legend-line" style={{ 
                backgroundColor: 'var(--secondary-color)',
                strokeDasharray: '5,5'
              }}></div>
              <span>Auto-detected Relationship</span>
            </div>
          )}
        </div>
        
        {nodes.some(n => n.data.conceptCluster && n.data.conceptCluster !== 'Other') && (
          <div className="legend-section">
            <h5>Concept Clusters</h5>
            {Object.entries(tagFamilies)
              .filter(([family]) => nodes.some(n => n.data.conceptCluster === family))
              .slice(0, 5) // Show only first 5 to avoid overwhelming
              .map(([family, tags]) => (
                <div key={family} className="legend-item">
                  <div 
                    className="legend-color" 
                    style={{ 
                      backgroundColor: getTagColor(
                        tags[0] || family, 
                        tagColorMap
                      ) 
                    }}
                  ></div>
                  <span>{family}</span>
                </div>
              ))}
            {Object.keys(tagFamilies).filter(family => 
              nodes.some(n => n.data.conceptCluster === family)
            ).length > 5 && (
              <div className="legend-item">
                <span>+ more clusters</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeGraph; 