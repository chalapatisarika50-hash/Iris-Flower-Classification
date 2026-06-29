import { DecisionTreeNode } from '../models';
import { Species } from '../types';
import { SPECIES_DETAILS } from '../data';
import { GitFork, Eye, Layers } from 'lucide-react';

interface DecisionTreeViewerProps {
  rootNode: DecisionTreeNode | null;
}

export default function DecisionTreeViewer({ rootNode }: DecisionTreeViewerProps) {
  if (!rootNode) {
    return (
      <div className="bg-white rounded-[32px] border border-natural-border/60 p-8 text-center text-natural-taupe font-medium">
        Train the Decision Tree model to inspect its tree structure.
      </div>
    );
  }

  // Recursive render component
  const renderNode = (node: DecisionTreeNode, pathType: 'root' | 'left' | 'right' = 'root') => {
    const sList: Species[] = ['setosa', 'versicolor', 'virginica'];
    const total = node.sampleCount;

    return (
      <div className="flex flex-col items-center w-full">
        {/* Connection line for children */}
        {pathType !== 'root' && (
          <div className="w-0.5 h-6 bg-natural-border/60 relative">
            <span className="absolute left-1/2 -translate-x-1/2 top-1 text-[9px] font-mono font-bold bg-white px-1.5 py-0.5 rounded-full border border-natural-border/40 text-natural-taupe">
              {pathType === 'left' ? 'Yes' : 'No'}
            </span>
          </div>
        )}

        {/* Node Box */}
        <div
          className={`w-full max-w-sm rounded-xl border p-4 shadow-2xs transition-all ${
            node.isLeaf
              ? 'border-natural-border/40 bg-natural-badge/20'
              : 'border-natural-border/60 bg-white'
          }`}
        >
          {/* Node Title / Split Rule */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {node.isLeaf ? (
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: node.prediction ? SPECIES_DETAILS[node.prediction].color : '#7D8471' }} />
              ) : (
                <GitFork className="w-4 h-4 text-natural-rose" />
              )}
              <span className={`text-[10px] font-bold font-mono uppercase tracking-wider ${node.isLeaf ? 'text-natural-taupe' : 'text-natural-rose'}`}>
                {node.isLeaf ? 'Leaf Node' : 'Decision Node'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-natural-olive bg-natural-badge/40 border border-natural-border/30 px-1.5 py-0.5 rounded">
              Gini: {node.gini.toFixed(3)}
            </span>
          </div>

          <div className="mb-3">
            {node.isLeaf ? (
              <div className="text-sm font-semibold text-natural-text">
                Predicts:{' '}
                <span className="font-serif italic font-bold" style={{ color: node.prediction ? SPECIES_DETAILS[node.prediction].color : '#7D8471' }}>
                  {node.prediction ? SPECIES_DETAILS[node.prediction].name : 'N/A'}
                </span>
              </div>
            ) : (
              <div className="text-sm font-semibold text-natural-text">
                Is {node.featureName} &le;{' '}
                <span className="font-mono text-natural-olive bg-natural-badge/40 border border-natural-border/30 px-1.5 py-0.5 rounded font-bold">{node.threshold}</span>?
              </div>
            )}
            <span className="text-[10px] text-natural-taupe font-mono mt-1 block">Samples at Node: n = {total}</span>
          </div>

          {/* Class Distribution Mini Progress Bar */}
          <div className="mt-3 pt-2.5 border-t border-natural-border/40">
            <div className="flex justify-between text-[9px] text-natural-taupe font-bold mb-1">
              <span>Class Distribution</span>
              <span className="font-mono">
                {node.distribution.setosa}/{node.distribution.versicolor}/{node.distribution.virginica}
              </span>
            </div>

            <div className="w-full h-1.5 bg-natural-bg/50 rounded-full overflow-hidden flex">
              {sList.map(s => {
                const count = node.distribution[s] || 0;
                const ratio = total > 0 ? count / total : 0;
                if (ratio === 0) return null;

                return (
                  <div
                    key={s}
                    style={{
                      width: `${ratio * 100}%`,
                      backgroundColor: SPECIES_DETAILS[s].color
                    }}
                    title={`${SPECIES_DETAILS[s].name}: ${count} (${Math.round(ratio * 100)}%)`}
                  />
                );
              })}
            </div>

            {/* Distribution Legend */}
            <div className="flex gap-2.5 mt-1.5 text-[9px] font-semibold text-natural-taupe">
              {sList.map(s => {
                const count = node.distribution[s] || 0;
                if (count === 0) return null;
                return (
                  <div key={s} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SPECIES_DETAILS[s].color }} />
                    <span>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Children Rows */}
        {!node.isLeaf && (node.left || node.right) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-2 border-t border-natural-border/40 pt-2">
            <div className="flex flex-col items-center">
              {node.left && renderNode(node.left, 'left')}
            </div>
            <div className="flex flex-col items-center">
              {node.right && renderNode(node.right, 'right')}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="tree-viewer-container" className="bg-white rounded-[32px] border border-natural-border/60 shadow-sm p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-natural-badge text-natural-olive rounded-xl border border-natural-border/30">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif italic text-xl text-natural-olive">Structural Split Hierarchy</h3>
          <p className="text-xs uppercase tracking-widest text-natural-taupe mt-1">
            A visual inspection of the branching logic recursively generated by Gini impurity split calculations.
          </p>
        </div>
      </div>

      <div className="w-full overflow-x-auto py-4 bg-natural-bg/25 rounded-2xl border border-natural-border/60 flex justify-center min-w-0">
        <div className="p-4 w-full max-w-4xl min-w-[320px]">
          {renderNode(rootNode, 'root')}
        </div>
      </div>
    </div>
  );
}
