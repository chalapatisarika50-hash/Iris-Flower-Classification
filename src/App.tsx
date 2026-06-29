import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Species, 
  IrisData, 
  ModelType, 
  KNNParams, 
  DecisionTreeParams, 
  NeuralNetworkParams, 
  ModelMetrics, 
  PredictionResult 
} from './types';
import { IRIS_DATASET, SPECIES_DETAILS } from './data';
import { 
  trainTestSplit, 
  predictKNN, 
  buildDecisionTree, 
  predictDecisionTree, 
  IrisNeuralNetwork, 
  calculateMetrics,
  DecisionTreeNode
} from './models';

// Import components
import DatasetExplorer from './components/DatasetExplorer';
import DecisionBoundary from './components/DecisionBoundary';
import PredictorCard from './components/PredictorCard';
import DecisionTreeViewer from './components/DecisionTreeViewer';

// Icons
import { 
  Activity, 
  Brain, 
  Sliders, 
  Sparkles, 
  Play, 
  Table, 
  Database, 
  CheckCircle, 
  RotateCw, 
  HelpCircle,
  TrendingDown,
  ChevronRight
} from 'lucide-react';

export default function App() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'simulator' | 'workbench' | 'explorer'>('simulator');

  // Input measurements state for the live simulator
  const [inputs, setInputs] = useState({
    sepalLength: 5.1,
    sepalWidth: 3.5,
    petalLength: 1.4,
    petalWidth: 0.2
  });

  // Highlight/hover syncing state
  const [highlightedPoint, setHighlightedPoint] = useState<IrisData | null>(null);

  // Model selection and split configuration
  const [modelType, setModelType] = useState<ModelType>('knn');
  const [trainRatio, setTrainRatio] = useState<number>(0.8); // 80% train / 20% test

  // Hyperparameters
  const [knnParams, setKnnParams] = useState<KNNParams>({ k: 5, distanceMetric: 'euclidean' });
  const [treeParams, setTreeParams] = useState<DecisionTreeParams>({ maxDepth: 3, minSamplesSplit: 2 });
  const [nnParams, setNnParams] = useState<NeuralNetworkParams>({ epochs: 150, learningRate: 0.1, hiddenLayers: 6 });

  // Trained models in memory
  const [trainedTree, setTrainedTree] = useState<DecisionTreeNode | null>(null);
  const [trainedNN, setTrainedNN] = useState<IrisNeuralNetwork | null>(null);

  // Split datasets in state
  const [splitData, setSplitData] = useState<{ train: IrisData[]; test: IrisData[] }>(() => 
    trainTestSplit(IRIS_DATASET, 0.8)
  );

  // Metrics history
  const [metrics, setMetrics] = useState<Record<ModelType, ModelMetrics | null>>({
    knn: null,
    decision_tree: null,
    neural_network: null
  });

  // Neural Network live training states
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [nnProgress, setNnProgress] = useState(0);

  // Instantly initialize default trained models on mount so the app starts fully functional
  useEffect(() => {
    handleTrainModel(true); // run silent initialization
  }, []);

  // Sync split data when ratio changes
  const handleSplitRatioChange = (val: number) => {
    setTrainRatio(val);
    const newSplit = trainTestSplit(IRIS_DATASET, val);
    setSplitData(newSplit);
  };

  // Main Model Training Engine
  const handleTrainModel = (silent: boolean = false) => {
    const { train, test } = splitData;

    if (modelType === 'knn') {
      // KNN doesn't require "training", we evaluate lazy predictions on the test set
      const predictFn = (p: { sepalLength: number; sepalWidth: number; petalLength: number; petalWidth: number }) => {
        return predictKNN(p, train, knnParams).species;
      };
      const evaluation = calculateMetrics(test, predictFn);
      setMetrics(prev => ({ ...prev, knn: evaluation }));
    }

    else if (modelType === 'decision_tree') {
      // Build decision tree model
      const treeRoot = buildDecisionTree(train, treeParams);
      setTrainedTree(treeRoot);

      const predictFn = (p: { sepalLength: number; sepalWidth: number; petalLength: number; petalWidth: number }) => {
        return predictDecisionTree(p, treeRoot).species;
      };
      const evaluation = calculateMetrics(test, predictFn);
      setMetrics(prev => ({ ...prev, decision_tree: evaluation }));
    }

    else if (modelType === 'neural_network') {
      // Neural Network training
      setIsTraining(true);
      setNnProgress(0);
      setLossHistory([]);

      const nn = new IrisNeuralNetwork(nnParams.hiddenLayers);
      nn.fitNormalization(train);

      let epoch = 0;
      const losses: number[] = [];
      const totalEpochs = nnParams.epochs;

      // Incremental training interval to render live training animation
      const interval = setInterval(() => {
        // Run 5 epochs per tick to speed up the UI animation but remain responsive
        const epochsPerTick = Math.min(10, totalEpochs - epoch);
        for (let i = 0; i < epochsPerTick; i++) {
          const loss = nn.trainEpoch(train, nnParams.learningRate);
          losses.push(loss);
          epoch++;
        }

        setLossHistory([...losses]);
        setNnProgress(Math.round((epoch / totalEpochs) * 100));

        if (epoch >= totalEpochs) {
          clearInterval(interval);
          setTrainedNN(nn);
          
          // Evaluate metrics on the test set
          const predictFn = (p: { sepalLength: number; sepalWidth: number; petalLength: number; petalWidth: number }) => {
            return nn.predict(p).species;
          };
          const evaluation = calculateMetrics(test, predictFn);
          setMetrics(prev => ({ ...prev, neural_network: evaluation }));
          setIsTraining(false);
        }
      }, 20);
    }
  };

  // Run predictions in real-time as sliders change or different models are selected
  const activePrediction = useMemo<PredictionResult>(() => {
    const { train } = splitData;

    if (modelType === 'knn') {
      return predictKNN(inputs, train, knnParams);
    } 
    
    else if (modelType === 'decision_tree') {
      if (trainedTree) {
        return predictDecisionTree(inputs, trainedTree);
      } else {
        // fallback to standard tree training if empty
        const defaultTree = buildDecisionTree(train, treeParams);
        return predictDecisionTree(inputs, defaultTree);
      }
    } 
    
    else { // neural network
      if (trainedNN) {
        return trainedNN.predict(inputs);
      } else {
        // fallback to standard lazy neural network
        const defaultNN = new IrisNeuralNetwork(nnParams.hiddenLayers);
        defaultNN.fitNormalization(train);
        // do a fast 50 epoch train
        for (let i = 0; i < 50; i++) defaultNN.trainEpoch(train, nnParams.learningRate);
        return defaultNN.predict(inputs);
      }
    }
  }, [inputs, modelType, splitData, knnParams, trainedTree, trainedNN, treeParams, nnParams]);

  // Combined predict function to pass down to visual decision boundary canvas
  const generalPredictor = (point: { sepalLength: number; sepalWidth: number; petalLength: number; petalWidth: number }) => {
    if (modelType === 'knn') {
      return predictKNN(point, splitData.train, knnParams).species;
    } else if (modelType === 'decision_tree') {
      const activeTree = trainedTree || buildDecisionTree(splitData.train, treeParams);
      return predictDecisionTree(point, activeTree).species;
    } else {
      const activeNN = trainedNN;
      if (activeNN) return activeNN.predict(point).species;
      // Fast prediction fallback
      return predictKNN(point, splitData.train, { k: 3, distanceMetric: 'euclidean' }).species;
    }
  };

  // Pick display metric scorecard for active model
  const activeMetrics = metrics[modelType];

  return (
    <div id="main-container" className="min-h-screen bg-natural-bg/40 text-natural-text antialiased font-sans">
      
      {/* Top Banner Branding */}
      <header className="bg-white border-b border-natural-border/60 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-natural-badge text-natural-olive rounded-xl border border-natural-border/40">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-semibold italic text-natural-olive tracking-tight flex items-center gap-2">
                Iris Flower Classifier
                <span className="text-[10px] uppercase tracking-widest font-bold bg-natural-badge text-natural-olive border border-natural-border/40 px-2 py-0.5 rounded-md">ML Sandbox</span>
              </h1>
              <p className="text-xs text-natural-muted font-medium">Explore botanical classifications, train browserside models, and inspect boundaries.</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex bg-natural-bg/50 rounded-xl p-1 border border-natural-border/60">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-white text-natural-text font-bold shadow-xs border border-natural-border/40'
                  : 'text-natural-taupe hover:text-natural-text'
              }`}
            >
              <Activity className="w-4 h-4 text-natural-olive" />
              Predictive Simulator
            </button>
            <button
              onClick={() => setActiveTab('workbench')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'workbench'
                  ? 'bg-white text-natural-text font-bold shadow-xs border border-natural-border/40'
                  : 'text-natural-taupe hover:text-natural-text'
              }`}
            >
              <Sliders className="w-4 h-4 text-natural-rose" />
              Model Workbench
            </button>
            <button
              onClick={() => setActiveTab('explorer')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'explorer'
                  ? 'bg-white text-natural-text font-bold shadow-xs border border-natural-border/40'
                  : 'text-natural-taupe hover:text-natural-text'
              }`}
            >
              <Database className="w-4 h-4 text-[#8A857C]" />
              Dataset Explorer
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* TAB 1: PREDICTIVE SIMULATOR & DECISION BOUNDARIES */}
        {activeTab === 'simulator' && (
          <div id="simulator-view" className="flex flex-col gap-8">
            <PredictorCard
              inputs={inputs}
              onChangeInputs={setInputs}
              prediction={activePrediction}
            />

            <DecisionBoundary
              trainData={splitData.train}
              testData={splitData.test}
              modelType={modelType}
              predictFn={generalPredictor}
              currentInputs={inputs}
              highlightedPoint={highlightedPoint}
              onHoverPoint={setHighlightedPoint}
            />
          </div>
        )}

        {/* TAB 2: MODEL WORKBENCH & EVALUATIONS */}
        {activeTab === 'workbench' && (
          <div id="workbench-view" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Column 1: Model Setup Panel */}
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-[32px] border border-natural-border/60 shadow-sm p-8">
                <h3 className="font-serif italic text-xl text-natural-olive mb-4 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-natural-olive" />
                  Model Configurator
                </h3>

                {/* Model selector */}
                <div className="mb-5">
                  <span className="text-xs uppercase tracking-widest text-natural-taupe block mb-3 font-bold">Algorithm Selection</span>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: 'knn', name: 'K-Nearest Neighbors', desc: 'Classifies based on proximity to labeled points' },
                      { id: 'decision_tree', name: 'Decision Tree', desc: 'Recursive splitting based on Gini impurities' },
                      { id: 'neural_network', name: 'Neural Network (MLP)', desc: 'Backprop network with Softmax output layer' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setModelType(m.id as ModelType); }}
                        className={`p-4 text-left rounded-xl border transition-all cursor-pointer ${
                          modelType === m.id
                            ? 'border-natural-olive bg-[#E8E4D9]/30 shadow-2xs'
                            : 'border-natural-border/50 hover:border-natural-border bg-white/40'
                        }`}
                      >
                        <span className="block font-serif font-semibold text-natural-text text-sm leading-none mb-1.5">{m.name}</span>
                        <span className="text-[11px] text-natural-muted block leading-normal">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hyperparameter adjustments */}
                <div className="mb-6 pt-5 border-t border-natural-border/40">
                  <span className="text-xs uppercase tracking-widest text-natural-taupe block mb-4 font-bold">Hyperparameters</span>
                  
                  {/* KNN params */}
                  {modelType === 'knn' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1 font-semibold">
                          <span className="text-natural-muted">Neighbors (K):</span>
                          <span className="font-mono text-natural-olive font-bold">{knnParams.k}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="15"
                          step="2" // odd numbers to prevent ties
                          value={knnParams.k}
                          onChange={e => setKnnParams({ ...knnParams, k: parseInt(e.target.value) })}
                          className="w-full accent-natural-olive cursor-pointer h-1.5 bg-natural-bg rounded-lg appearance-none"
                        />
                      </div>

                      <div>
                        <span className="text-xs text-natural-muted font-semibold block mb-1.5">Distance Metric:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {['euclidean', 'manhattan'].map(m => (
                            <button
                              key={m}
                              onClick={() => setKnnParams({ ...knnParams, distanceMetric: m as any })}
                              className={`py-1.5 text-xs rounded-lg font-medium border capitalize cursor-pointer transition-all ${
                                knnParams.distanceMetric === m
                                  ? 'bg-natural-olive border-natural-olive text-white shadow-2xs'
                                  : 'bg-white border-natural-border text-natural-muted hover:border-natural-border'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Decision Tree params */}
                  {modelType === 'decision_tree' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1 font-semibold">
                          <span className="text-natural-muted">Maximum Depth:</span>
                          <span className="font-mono text-natural-olive font-bold">{treeParams.maxDepth}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          value={treeParams.maxDepth}
                          onChange={e => setTreeParams({ ...treeParams, maxDepth: parseInt(e.target.value) })}
                          className="w-full accent-natural-olive cursor-pointer h-1.5 bg-natural-bg rounded-lg appearance-none"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1 font-semibold">
                          <span className="text-natural-muted">Min Samples to Split:</span>
                          <span className="font-mono text-natural-olive font-bold">{treeParams.minSamplesSplit}</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="10"
                          step="1"
                          value={treeParams.minSamplesSplit}
                          onChange={e => setTreeParams({ ...treeParams, minSamplesSplit: parseInt(e.target.value) })}
                          className="w-full accent-natural-olive cursor-pointer h-1.5 bg-natural-bg rounded-lg appearance-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Neural Network params */}
                  {modelType === 'neural_network' && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1 font-semibold">
                          <span className="text-natural-muted">Training Epochs:</span>
                          <span className="font-mono text-natural-olive font-bold">{nnParams.epochs}</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="300"
                          step="10"
                          value={nnParams.epochs}
                          onChange={e => setNnParams({ ...nnParams, epochs: parseInt(e.target.value) })}
                          className="w-full accent-natural-olive cursor-pointer h-1.5 bg-natural-bg rounded-lg appearance-none"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1 font-semibold">
                          <span className="text-natural-muted">Learning Rate (&eta;):</span>
                          <span className="font-mono text-natural-olive font-bold">{nnParams.learningRate.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="0.5"
                          step="0.01"
                          value={nnParams.learningRate}
                          onChange={e => setNnParams({ ...nnParams, learningRate: parseFloat(e.target.value) })}
                          className="w-full accent-natural-olive cursor-pointer h-1.5 bg-natural-bg rounded-lg appearance-none"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1 font-semibold">
                          <span className="text-natural-muted">Hidden Neurons (L1):</span>
                          <span className="font-mono text-natural-olive font-bold">{nnParams.hiddenLayers}</span>
                        </div>
                        <input
                          type="range"
                          min="4"
                          max="12"
                          step="1"
                          value={nnParams.hiddenLayers}
                          onChange={e => setNnParams({ ...nnParams, hiddenLayers: parseInt(e.target.value) })}
                          className="w-full accent-natural-olive cursor-pointer h-1.5 bg-natural-bg rounded-lg appearance-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Train Test ratio split */}
                <div className="mb-6 pt-5 border-t border-natural-border/40">
                  <div className="flex justify-between text-xs mb-1.5 font-bold uppercase text-natural-taupe tracking-wider">
                    <span>Train/Test Ratio</span>
                    <span className="font-mono text-natural-olive font-bold">
                      {Math.round(trainRatio * 100)}% / {Math.round((1 - trainRatio) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="0.9"
                    step="0.05"
                    value={trainRatio}
                    onChange={e => handleSplitRatioChange(parseFloat(e.target.value))}
                    disabled={isTraining}
                    className="w-full accent-natural-olive cursor-pointer h-1.5 bg-natural-bg rounded-lg appearance-none disabled:opacity-40"
                  />
                  <div className="flex justify-between text-[10px] text-natural-taupe font-mono mt-1">
                    <span>{Math.round(150 * trainRatio)} Train samples</span>
                    <span>{Math.round(150 * (1 - trainRatio))} Test samples</span>
                  </div>
                </div>

                {/* Train Button */}
                <button
                  onClick={() => handleTrainModel()}
                  disabled={isTraining}
                  className="w-full py-3.5 bg-natural-olive hover:bg-natural-olive/95 disabled:bg-natural-olive/60 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-natural-olive/10 flex items-center justify-center gap-2"
                >
                  {isTraining ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Training Neural Net ({nnProgress}%)...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white text-white" />
                      Train {modelType === 'knn' ? 'Lazy Evaluator' : modelType === 'decision_tree' ? 'Decision Tree' : 'Neural Network'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Column 2 & 3: Performance Reports & Structure Visualizers */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Report Panel */}
              <div className="bg-white rounded-[32px] border border-natural-border/60 shadow-sm p-8">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-natural-border/40">
                  <div>
                    <h3 className="font-serif italic text-xl text-natural-olive">Evaluation Scorecard</h3>
                    <p className="text-xs uppercase tracking-widest text-natural-taupe mt-1">Validated metrics evaluated against the withheld test partition</p>
                  </div>

                  {activeMetrics ? (
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-natural-taupe block uppercase tracking-wider">Test Accuracy</span>
                      <span className="text-3xl font-serif italic font-bold text-natural-olive">
                        {Math.round(activeMetrics.accuracy * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-natural-rose bg-natural-rose/5 border border-natural-rose/30 px-3 py-1 rounded-xl font-semibold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      Awaiting Training...
                    </span>
                  )}
                </div>

                {activeMetrics ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Confusion Matrix */}
                    <div>
                      <span className="text-xs uppercase tracking-widest text-natural-taupe block mb-4 font-bold">Confusion Matrix (Heatmap)</span>
                      
                      <div className="flex flex-col gap-1.5">
                        {/* Column Header */}
                        <div className="grid grid-cols-4 gap-1 text-[10px] text-natural-taupe font-mono text-center uppercase tracking-wider">
                          <div />
                          <div>Setosa</div>
                          <div>Versicolor</div>
                          <div>Virginica</div>
                        </div>

                        {/* Rows */}
                        {(['setosa', 'versicolor', 'virginica'] as Species[]).map(actual => {
                          const row = activeMetrics.confusionMatrix[actual];
                          return (
                            <div key={actual} className="grid grid-cols-4 gap-1 text-center items-center">
                              {/* Row Header */}
                              <div className="text-[10px] font-bold text-natural-taupe text-left font-mono uppercase tracking-wider truncate">{actual}</div>
                              
                              {(['setosa', 'versicolor', 'virginica'] as Species[]).map(pred => {
                                const val = row[pred];
                                const isDiagonal = actual === pred;
                                const maxVal = Math.max(1, Math.round(150 * (1 - trainRatio) / 3));
                                const weight = Math.min(1, val / maxVal);

                                return (
                                  <div
                                    key={pred}
                                    style={{
                                      backgroundColor: isDiagonal
                                        ? `rgba(125, 132, 113, ${0.1 + weight * 0.8})` // Sage Correct
                                        : val > 0 
                                          ? `rgba(198, 139, 119, ${0.1 + weight * 0.8})` // Terracotta Incorrect
                                          : 'rgba(232, 228, 217, 0.4)' // Off-white Background
                                    }}
                                    className={`py-3.5 text-xs font-mono font-bold rounded-xl border border-natural-border/30 transition-all ${
                                      val > 0 ? 'text-natural-text' : 'text-natural-taupe font-normal'
                                    }`}
                                  >
                                    {val}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[9px] text-natural-taupe font-mono text-center mt-3">Rows: Actual class | Columns: Predicted class</div>
                    </div>

                    {/* Class Classification Report */}
                    <div>
                      <span className="text-xs uppercase tracking-widest text-natural-taupe block mb-4 font-bold">Precision, Recall & F1</span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-medium text-natural-muted">
                          <thead>
                            <tr className="border-b border-natural-border/50 font-bold uppercase text-[9px] tracking-wider text-natural-taupe pb-2">
                              <th className="pb-2">Class</th>
                              <th className="pb-2 text-right">Precision</th>
                              <th className="pb-2 text-right">Recall</th>
                              <th className="pb-2 text-right">F1-Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-natural-border/30 font-mono">
                            {(['setosa', 'versicolor', 'virginica'] as Species[]).map(s => {
                              const specMetrics = activeMetrics.classMetrics[s];
                              return (
                                <tr key={s} className="text-natural-text">
                                  <td className="py-2.5 font-sans font-semibold text-natural-text flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SPECIES_DETAILS[s].color }} />
                                    <span className="font-serif italic text-sm">{SPECIES_DETAILS[s].name}</span>
                                  </td>
                                  <td className="py-2.5 text-right">{specMetrics.precision.toFixed(2)}</td>
                                  <td className="py-2.5 text-right">{specMetrics.recall.toFixed(2)}</td>
                                  <td className="py-2.5 text-right font-bold text-natural-text">{specMetrics.f1Score.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 font-medium">
                    Click "Train" on the side config to display validation scorecard reports.
                  </div>
                )}
              </div>

              {/* Loss Curve Visualizer (Neural Net specific) */}
              {modelType === 'neural_network' && lossHistory.length > 0 && (
                <div className="bg-white rounded-[32px] border border-natural-border/60 shadow-sm p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-serif italic text-lg text-natural-olive flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4 text-natural-rose" />
                        Loss Optimization Gradient Curve
                      </h4>
                      <p className="text-xs uppercase tracking-widest text-natural-taupe mt-1">Cross-entropy loss descending per gradient updates epoch</p>
                    </div>
                    <span className="text-xs font-mono bg-natural-badge border border-natural-border/40 px-2.5 py-1 rounded-lg text-natural-olive font-bold">
                      Loss: {lossHistory[lossHistory.length - 1]?.toFixed(4)}
                    </span>
                  </div>

                  {/* Custom responsive SVG Loss Chart */}
                  <div className="w-full bg-natural-bg/25 rounded-2xl p-4 border border-natural-border/60">
                    <svg className="w-full h-40 overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#C68B77" stopOpacity="0.2"/>
                          <stop offset="100%" stopColor="#C68B77" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>

                      {/* Guide Lines */}
                      <line x1="0" y1="0" x2="500" y2="0" stroke="#E5E1D8" strokeWidth="0.5" strokeDasharray="3,3" />
                      <line x1="0" y1="60" x2="500" y2="60" stroke="#E5E1D8" strokeWidth="0.5" strokeDasharray="3,3" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="#E5E1D8" strokeWidth="0.5" strokeDasharray="3,3" />

                      {/* Area beneath path */}
                      <path
                        d={`
                          M 0 120
                          ${lossHistory.map((loss, idx) => {
                            const x = (idx / (lossHistory.length - 1 || 1)) * 500;
                            const y = Math.min(120, Math.max(0, 120 - (loss * 60))); // scale loss values
                            return `L ${x} ${y}`;
                          }).join(' ')}
                          L 500 120 Z
                        `}
                        fill="url(#gradient)"
                      />

                      {/* The Line path */}
                      <path
                        d={lossHistory.map((loss, idx) => {
                          const x = (idx / (lossHistory.length - 1 || 1)) * 500;
                          const y = Math.min(120, Math.max(0, 120 - (loss * 60)));
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#C68B77"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex justify-between text-[10px] text-natural-taupe font-mono mt-1 pt-1.5 border-t border-natural-border/40">
                      <span>Epoch: 1</span>
                      <span>Epoch: {lossHistory.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Decision Tree Viewer Specific */}
              {modelType === 'decision_tree' && (
                <DecisionTreeViewer rootNode={trainedTree} />
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DATASET EXPLORER */}
        {activeTab === 'explorer' && (
          <DatasetExplorer
            highlightedPoint={highlightedPoint}
            onHighlightPoint={setHighlightedPoint}
          />
        )}
      </main>

      {/* Footer System Credits */}
      <footer className="bg-white border-t border-natural-border/60 py-6 mt-16 text-center text-xs text-natural-taupe">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-medium text-natural-muted">
            Iris Flower Classification ML Playground — Pure Web Runtime
          </p>
          <p className="font-mono text-[10px] text-natural-taupe">
            Node: browser-native | Model Type: {modelType.toUpperCase()}
          </p>
        </div>
      </footer>
    </div>
  );
}
