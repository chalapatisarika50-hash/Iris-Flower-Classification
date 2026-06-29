export type Species = 'setosa' | 'versicolor' | 'virginica';

export interface IrisData {
  id: number;
  sepalLength: number;
  sepalWidth: number;
  petalLength: number;
  petalWidth: number;
  species: Species;
}

export type ModelType = 'knn' | 'decision_tree' | 'neural_network';

export interface ModelMetrics {
  accuracy: number;
  confusionMatrix: {
    [key in Species]: {
      [key in Species]: number;
    };
  };
  classMetrics: {
    [key in Species]: {
      precision: number;
      recall: number;
      f1Score: number;
    };
  };
}

export interface KNNParams {
  k: number;
  distanceMetric: 'euclidean' | 'manhattan';
}

export interface DecisionTreeParams {
  maxDepth: number;
  minSamplesSplit: number;
}

export interface NeuralNetworkParams {
  epochs: number;
  learningRate: number;
  hiddenLayers: number;
}

export interface PredictionResult {
  species: Species;
  confidences: {
    [key in Species]: number;
  };
}
