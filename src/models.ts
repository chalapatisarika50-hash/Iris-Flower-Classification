import { IrisData, Species, ModelMetrics, KNNParams, DecisionTreeParams, NeuralNetworkParams, PredictionResult } from './types';

// Helper: Train-Test Split
export function trainTestSplit(data: IrisData[], trainRatio: number = 0.8, seed: number = 42): { train: IrisData[], test: IrisData[] } {
  // Simple seeded shuffle to keep splits consistent or customizable
  const shuffled = [...data];
  let currentSeed = seed;
  const random = () => {
    const x = Math.sin(currentSeed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const splitIdx = Math.floor(shuffled.length * trainRatio);
  return {
    train: shuffled.slice(0, splitIdx),
    test: shuffled.slice(splitIdx)
  };
}

// -------------------------------------------------------------------------
// 1. K-NEAREST NEIGHBORS (KNN)
// -------------------------------------------------------------------------
export function predictKNN(
  point: { sepalLength: number; sepalWidth: number; petalLength: number; petalWidth: number },
  trainData: IrisData[],
  params: KNNParams
): PredictionResult {
  const { k, distanceMetric } = params;

  // Compute distances
  const list = trainData.map(trainPoint => {
    let distance = 0;
    const dLength = point.sepalLength - trainPoint.sepalLength;
    const dWidth = point.sepalWidth - trainPoint.sepalWidth;
    const dPetalLength = point.petalLength - trainPoint.petalLength;
    const dPetalWidth = point.petalWidth - trainPoint.petalWidth;

    if (distanceMetric === 'euclidean') {
      distance = Math.sqrt(dLength * dLength + dWidth * dWidth + dPetalLength * dPetalLength + dPetalWidth * dPetalWidth);
    } else { // manhattan
      distance = Math.abs(dLength) + Math.abs(dWidth) + Math.abs(dPetalLength) + Math.abs(dPetalWidth);
    }

    return { distance, species: trainPoint.species };
  });

  // Sort by distance ascending
  list.sort((a, b) => a.distance - b.distance);

  // Take the top K
  const nearest = list.slice(0, Math.min(k, list.length));

  // Count votes
  const counts: { [key in Species]: number } = { setosa: 0, versicolor: 0, virginica: 0 };
  nearest.forEach(n => {
    counts[n.species]++;
  });

  // Calculate confidences
  const totalVotes = nearest.length || 1;
  const confidences: { [key in Species]: number } = {
    setosa: counts.setosa / totalVotes,
    versicolor: counts.versicolor / totalVotes,
    virginica: counts.virginica / totalVotes
  };

  // Find majority class
  let bestSpecies: Species = 'setosa';
  let maxCount = -1;
  (Object.keys(counts) as Species[]).forEach(species => {
    if (counts[species] > maxCount) {
      maxCount = counts[species];
      bestSpecies = species;
    }
  });

  return { species: bestSpecies, confidences };
}


// -------------------------------------------------------------------------
// 2. DECISION TREE CLASSIFIER
// -------------------------------------------------------------------------
export interface DecisionTreeNode {
  featureIndex?: number; // 0: sepalLength, 1: sepalWidth, 2: petalLength, 3: petalWidth
  featureName?: string;
  threshold?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  isLeaf: boolean;
  prediction?: Species;
  sampleCount: number;
  distribution: { [key in Species]: number };
  gini: number;
}

const FEATURE_NAMES = ['Sepal Length', 'Sepal Width', 'Petal Length', 'Petal Width'];

function getFeatureValue(data: IrisData, index: number): number {
  switch (index) {
    case 0: return data.sepalLength;
    case 1: return data.sepalWidth;
    case 2: return data.petalLength;
    case 3: return data.petalWidth;
    default: return 0;
  }
}

function calculateGini(data: IrisData[]): number {
  if (data.length === 0) return 0;
  const counts = { setosa: 0, versicolor: 0, virginica: 0 };
  data.forEach(item => counts[item.species]++);
  
  let sumSq = 0;
  (Object.keys(counts) as Species[]).forEach(s => {
    const p = counts[s] / data.length;
    sumSq += p * p;
  });
  return 1 - sumSq;
}

export function buildDecisionTree(
  data: IrisData[],
  params: DecisionTreeParams,
  currentDepth: number = 0
): DecisionTreeNode {
  const sampleCount = data.length;
  const gini = calculateGini(data);
  
  // Calculate class distribution
  const distribution = { setosa: 0, versicolor: 0, virginica: 0 };
  data.forEach(item => distribution[item.species]++);

  // Determine majority prediction
  let prediction: Species = 'setosa';
  let maxCount = -1;
  (Object.keys(distribution) as Species[]).forEach(s => {
    if (distribution[s] > maxCount) {
      maxCount = distribution[s];
      prediction = s;
    }
  });

  // Base cases: pure node, too few samples, or max depth reached
  if (
    gini === 0 ||
    sampleCount < params.minSamplesSplit ||
    currentDepth >= params.maxDepth
  ) {
    return {
      isLeaf: true,
      prediction,
      sampleCount,
      distribution,
      gini
    };
  }

  // Find best split
  let bestGiniGain = -1;
  let bestFeatureIndex = -1;
  let bestThreshold = -1;
  let bestLeftData: IrisData[] = [];
  let bestRightData: IrisData[] = [];

  for (let fIdx = 0; fIdx < 4; fIdx++) {
    // Collect all values of this feature to consider as split candidates
    const values = data.map(item => getFeatureValue(item, fIdx)).sort((a, b) => a - b);
    
    // Test midpoints between adjacent unique sorted values
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] === values[i + 1]) continue;
      const threshold = (values[i] + values[i + 1]) / 2;

      const left = data.filter(item => getFeatureValue(item, fIdx) <= threshold);
      const right = data.filter(item => getFeatureValue(item, fIdx) > threshold);

      if (left.length === 0 || right.length === 0) continue;

      const leftGini = calculateGini(left);
      const rightGini = calculateGini(right);

      // Weighted Gini impurity
      const weightedGini = (left.length / sampleCount) * leftGini + (right.length / sampleCount) * rightGini;
      const gain = gini - weightedGini;

      if (gain > bestGiniGain) {
        bestGiniGain = gain;
        bestFeatureIndex = fIdx;
        bestThreshold = threshold;
        bestLeftData = left;
        bestRightData = right;
      }
    }
  }

  // If no split improves Gini, return leaf node
  if (bestFeatureIndex === -1 || bestGiniGain <= 0.0001) {
    return {
      isLeaf: true,
      prediction,
      sampleCount,
      distribution,
      gini
    };
  }

  // Recurse
  return {
    isLeaf: false,
    featureIndex: bestFeatureIndex,
    featureName: FEATURE_NAMES[bestFeatureIndex],
    threshold: Number(bestThreshold.toFixed(3)),
    left: buildDecisionTree(bestLeftData, params, currentDepth + 1),
    right: buildDecisionTree(bestRightData, params, currentDepth + 1),
    sampleCount,
    distribution,
    gini
  };
}

export function predictDecisionTree(
  point: { sepalLength: number; sepalWidth: number; petalLength: number; petalWidth: number },
  node: DecisionTreeNode
): PredictionResult {
  if (node.isLeaf) {
    const total = node.sampleCount || 1;
    const confidences = {
      setosa: node.distribution.setosa / total,
      versicolor: node.distribution.versicolor / total,
      virginica: node.distribution.virginica / total
    };
    return {
      species: node.prediction || 'setosa',
      confidences
    };
  }

  const fIdx = node.featureIndex!;
  const threshold = node.threshold!;
  let val = 0;
  switch (fIdx) {
    case 0: val = point.sepalLength; break;
    case 1: val = point.sepalWidth; break;
    case 2: val = point.petalLength; break;
    case 3: val = point.petalWidth; break;
  }

  if (val <= threshold) {
    return predictDecisionTree(point, node.left!);
  } else {
    return predictDecisionTree(point, node.right!);
  }
}


// -------------------------------------------------------------------------
// 3. MULTI-CLASS FEEDFORWARD NEURAL NETWORK (SOFTMAX REGRESSION / 2-LAYER MLP)
// -------------------------------------------------------------------------
export class IrisNeuralNetwork {
  // Model weights and biases
  // Layer 1 (Hidden): Input 4 -> Hidden H
  w1: number[][]; // H x 4
  b1: number[];   // H
  
  // Layer 2 (Output): Hidden H -> Output 3
  w2: number[][]; // 3 x H
  b2: number[];   // 3

  // Feature Min/Max for normalization (computed from training data)
  minVals: number[] = [4.3, 2.0, 1.0, 0.1];
  maxVals: number[] = [7.9, 4.4, 6.9, 2.5];

  private numHidden: number;

  constructor(numHidden: number = 6, seed: number = 101) {
    this.numHidden = numHidden;
    this.w1 = [];
    this.b1 = new Array(numHidden).fill(0);
    this.w2 = [];
    this.b2 = new Array(3).fill(0);

    this.initializeWeights(seed);
  }

  private initializeWeights(seed: number) {
    let currentSeed = seed;
    const rand = () => {
      // Seeded normal random (Box-Muller transform)
      let u = 0, v = 0;
      while (u === 0) u = Math.sin(currentSeed++) * 10000 - Math.floor(Math.sin(currentSeed++) * 10000);
      while (v === 0) v = Math.cos(currentSeed++) * 10000 - Math.floor(Math.cos(currentSeed++) * 10000);
      const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return num;
    };

    // Xavier initialization (or standard random initialization scaled)
    const scale1 = Math.sqrt(2.0 / 4); // ReLU scaling
    this.w1 = [];
    for (let i = 0; i < this.numHidden; i++) {
      this.w1.push([rand() * scale1, rand() * scale1, rand() * scale1, rand() * scale1]);
      this.b1[i] = 0;
    }

    const scale2 = Math.sqrt(2.0 / this.numHidden);
    this.w2 = [];
    for (let i = 0; i < 3; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.numHidden; j++) {
        row.push(rand() * scale2);
      }
      this.w2.push(row);
      this.b2[i] = 0;
    }
  }

  // Computes the normalization parameters from training data
  fitNormalization(trainData: IrisData[]) {
    if (trainData.length === 0) return;
    this.minVals = [Infinity, Infinity, Infinity, Infinity];
    this.maxVals = [-Infinity, -Infinity, -Infinity, -Infinity];

    trainData.forEach(item => {
      const vals = [item.sepalLength, item.sepalWidth, item.petalLength, item.petalWidth];
      for (let i = 0; i < 4; i++) {
        if (vals[i] < this.minVals[i]) this.minVals[i] = vals[i];
        if (vals[i] > this.maxVals[i]) this.maxVals[i] = vals[i];
      }
    });

    // Avoid division by zero
    for (let i = 0; i < 4; i++) {
      if (this.minVals[i] === this.maxVals[i]) {
        this.maxVals[i] += 1.0;
      }
    }
  }

  normalize(vals: number[]): number[] {
    return vals.map((v, i) => (v - this.minVals[i]) / (this.maxVals[i] - this.minVals[i]));
  }

  // Forward Pass
  // Returns: [reluHiddenOutputs, softmaxOutputs]
  forward(xNorm: number[]): [number[], number[]] {
    // Input -> Hidden
    const z1: number[] = [];
    const a1: number[] = [];
    for (let i = 0; i < this.numHidden; i++) {
      let sum = this.b1[i];
      for (let j = 0; j < 4; j++) {
        sum += xNorm[j] * this.w1[i][j];
      }
      z1.push(sum);
      a1.push(Math.max(0, sum)); // ReLU
    }

    // Hidden -> Output
    const z2: number[] = [];
    for (let i = 0; i < 3; i++) {
      let sum = this.b2[i];
      for (let j = 0; j < this.numHidden; j++) {
        sum += a1[j] * this.w2[i][j];
      }
      z2.push(sum);
    }

    // Softmax
    const maxZ2 = Math.max(...z2);
    const exps = z2.map(v => Math.exp(v - maxZ2));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    const a2 = exps.map(v => v / (sumExps || 1));

    return [a1, a2];
  }

  // Single Gradient Descent Step
  // Returns loss of this sample
  trainSample(xNorm: number[], yOneHot: number[], lr: number): number {
    // 1. Forward
    const [a1, a2] = this.forward(xNorm);

    // Compute Loss (Cross Entropy)
    // loss = -sum(y_i * log(a2_i))
    let loss = 0;
    for (let i = 0; i < 3; i++) {
      if (yOneHot[i] > 0) {
        loss -= Math.log(Math.max(a2[i], 1e-15));
      }
    }

    // 2. Backward
    // dZ2 = a2 - y
    const dz2 = [a2[0] - yOneHot[0], a2[1] - yOneHot[1], a2[2] - yOneHot[2]];

    // dW2 = dz2 * a1^T, db2 = dz2
    const dw2: number[][] = [];
    for (let i = 0; i < 3; i++) {
      const row: number[] = [];
      for (let j = 0; j < this.numHidden; j++) {
        row.push(dz2[i] * a1[j]);
      }
      dw2.push(row);
    }

    // dA1 = dZ2 * W2
    const da1: number[] = [];
    for (let j = 0; j < this.numHidden; j++) {
      let sum = 0;
      for (let i = 0; i < 3; i++) {
        sum += dz2[i] * this.w2[i][j];
      }
      da1.push(sum);
    }

    // dZ1 = dA1 * (z1 > 0 ? 1 : 0) (where a1 is max(0, z1), so we can use a1 > 0)
    const dz1: number[] = [];
    for (let j = 0; j < this.numHidden; j++) {
      dz1.push(a1[j] > 0 ? da1[j] : 0);
    }

    // dW1 = dz1 * x^T
    const dw1: number[][] = [];
    for (let i = 0; i < this.numHidden; i++) {
      const row: number[] = [];
      for (let j = 0; j < 4; j++) {
        row.push(dz1[i] * xNorm[j]);
      }
      dw1.push(row);
    }

    // Update Weights & Biases
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < this.numHidden; j++) {
        this.w2[i][j] -= lr * dw2[i][j];
      }
      this.b2[i] -= lr * dz2[i];
    }

    for (let i = 0; i < this.numHidden; i++) {
      for (let j = 0; j < 4; j++) {
        this.w1[i][j] -= lr * dw1[i][j];
      }
      this.b1[i] -= lr * dz1[i];
    }

    return loss;
  }

  // Full Epoch Training (trained on whole dataset)
  // Returns average loss for the epoch
  trainEpoch(trainData: IrisData[], lr: number): number {
    let totalLoss = 0;
    
    // Shuffle training data slightly for online SGD
    const shuffled = [...trainData].sort(() => Math.random() - 0.5);

    shuffled.forEach(item => {
      const xNorm = this.normalize([item.sepalLength, item.sepalWidth, item.petalLength, item.petalWidth]);
      const yOneHot = [
        item.species === 'setosa' ? 1 : 0,
        item.species === 'versicolor' ? 1 : 0,
        item.species === 'virginica' ? 1 : 0
      ];
      const loss = this.trainSample(xNorm, yOneHot, lr);
      totalLoss += loss;
    });

    return totalLoss / (trainData.length || 1);
  }

  predict(point: { sepalLength: number; sepalWidth: number; petalLength: number; petalWidth: number }): PredictionResult {
    const xNorm = this.normalize([point.sepalLength, point.sepalWidth, point.petalLength, point.petalWidth]);
    const [, a2] = this.forward(xNorm);

    const confidences: { [key in Species]: number } = {
      setosa: a2[0],
      versicolor: a2[1],
      virginica: a2[2]
    };

    let bestIdx = 0;
    let maxConf = -1;
    for (let i = 0; i < 3; i++) {
      if (a2[i] > maxConf) {
        maxConf = a2[i];
        bestIdx = i;
      }
    }

    const speciesList: Species[] = ['setosa', 'versicolor', 'virginica'];
    return {
      species: speciesList[bestIdx],
      confidences
    };
  }
}

// -------------------------------------------------------------------------
// GENERAL METRICS GENERATOR
// -------------------------------------------------------------------------
export function calculateMetrics(
  testData: IrisData[],
  predictFn: (point: { sepalLength: number; sepalWidth: number; petalLength: number; petalWidth: number }) => Species
): ModelMetrics {
  const speciesList: Species[] = ['setosa', 'versicolor', 'virginica'];

  // Initialize confusion matrix
  const confusionMatrix = {
    setosa: { setosa: 0, versicolor: 0, virginica: 0 },
    versicolor: { setosa: 0, versicolor: 0, virginica: 0 },
    virginica: { setosa: 0, versicolor: 0, virginica: 0 }
  };

  let correctCount = 0;

  // Fill confusion matrix
  testData.forEach(item => {
    const pred = predictFn({
      sepalLength: item.sepalLength,
      sepalWidth: item.sepalWidth,
      petalLength: item.petalLength,
      petalWidth: item.petalWidth
    });

    confusionMatrix[item.species][pred]++;
    if (item.species === pred) {
      correctCount++;
    }
  });

  const accuracy = testData.length > 0 ? correctCount / testData.length : 0;

  // Class-specific precision, recall, f1
  const classMetrics = {
    setosa: { precision: 0, recall: 0, f1Score: 0 },
    versicolor: { precision: 0, recall: 0, f1Score: 0 },
    virginica: { precision: 0, recall: 0, f1Score: 0 }
  };

  speciesList.forEach(actualSpecies => {
    // True positives
    const tp = confusionMatrix[actualSpecies][actualSpecies];

    // False positives: sum of predictions for actualSpecies where actual is not actualSpecies
    let fp = 0;
    speciesList.forEach(otherSpecies => {
      if (otherSpecies !== actualSpecies) {
        fp += confusionMatrix[otherSpecies][actualSpecies];
      }
    });

    // False negatives: sum of predictions for other species where actual is actualSpecies
    let fn = 0;
    speciesList.forEach(otherSpecies => {
      if (otherSpecies !== actualSpecies) {
        fn += confusionMatrix[actualSpecies][otherSpecies];
      }
    });

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    classMetrics[actualSpecies] = {
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1Score: Number(f1Score.toFixed(3))
    };
  });

  return {
    accuracy: Number(accuracy.toFixed(3)),
    confusionMatrix,
    classMetrics
  };
}
