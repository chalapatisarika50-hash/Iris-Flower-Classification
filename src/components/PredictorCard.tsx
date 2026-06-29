import { PredictionResult, Species } from '../types';
import { SPECIES_DETAILS } from '../data';
import { SPECIES_IMAGES } from '../assets';
import { HelpCircle, Sparkles, Sliders } from 'lucide-react';

interface PredictorCardProps {
  inputs: {
    sepalLength: number;
    sepalWidth: number;
    petalLength: number;
    petalWidth: number;
  };
  onChangeInputs: (inputs: {
    sepalLength: number;
    sepalWidth: number;
    petalLength: number;
    petalWidth: number;
  }) => void;
  prediction: PredictionResult;
}

// Representative presets
const PRESETS = [
  {
    name: 'Typical Setosa',
    values: { sepalLength: 5.0, sepalWidth: 3.5, petalLength: 1.5, petalWidth: 0.2 },
    colorClass: 'hover:border-[#7D8471] hover:bg-[#7D8471]/5'
  },
  {
    name: 'Average Versicolor',
    values: { sepalLength: 6.0, sepalWidth: 2.8, petalLength: 4.3, petalWidth: 1.3 },
    colorClass: 'hover:border-[#8A857C] hover:bg-[#8A857C]/5'
  },
  {
    name: 'Giant Virginica',
    values: { sepalLength: 7.3, sepalWidth: 3.1, petalLength: 6.2, petalWidth: 2.1 },
    colorClass: 'hover:border-[#C68B77] hover:bg-[#C68B77]/5'
  },
  {
    name: 'Ambiguous Borderline',
    values: { sepalLength: 5.9, sepalWidth: 2.7, petalLength: 4.9, petalWidth: 1.7 },
    colorClass: 'hover:border-natural-border hover:bg-natural-badge/20'
  }
];

export default function PredictorCard({
  inputs,
  onChangeInputs,
  prediction
}: PredictorCardProps) {
  const { species, confidences } = prediction;
  const pDetails = SPECIES_DETAILS[species];
  const pImage = SPECIES_IMAGES[species];

  const handleSliderChange = (field: keyof typeof inputs, val: number) => {
    onChangeInputs({
      ...inputs,
      [field]: val
    });
  };

  const loadPreset = (vals: typeof inputs) => {
    onChangeInputs(vals);
  };

  return (
    <div id="predictor-card-container" className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      {/* Sliders Input Panel */}
      <div id="sliders-panel" className="lg:col-span-7 bg-white rounded-[32px] border border-natural-border/60 shadow-xs p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-natural-badge text-natural-olive rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl italic text-natural-olive">Botanical Measurement Simulator</h3>
              <p className="text-xs uppercase tracking-widest text-natural-taupe mt-1">Adjust dimensions to update the classifier</p>
            </div>
          </div>

          {/* Presets Grid */}
          <div className="mb-8">
            <span className="text-[10px] uppercase font-bold tracking-widest text-natural-taupe block mb-3">Preset Templates</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESETS.map(p => {
                const isActive = 
                  inputs.sepalLength === p.values.sepalLength &&
                  inputs.sepalWidth === p.values.sepalWidth &&
                  inputs.petalLength === p.values.petalLength &&
                  inputs.petalWidth === p.values.petalWidth;

                const isSetosa = p.name.includes('Setosa');
                const isVersicolor = p.name.includes('Versicolor');
                const isVirginica = p.name.includes('Virginica');
                
                let activeStyle = '';
                if (isActive) {
                  if (isSetosa) activeStyle = 'border-[#7D8471] bg-[#7D8471]/10 text-[#5A5A40] shadow-2xs';
                  else if (isVersicolor) activeStyle = 'border-[#8A857C] bg-[#8A857C]/10 text-[#6B665E] shadow-2xs';
                  else if (isVirginica) activeStyle = 'border-[#C68B77] bg-[#C68B77]/10 text-[#A36B58] shadow-2xs';
                  else activeStyle = 'border-natural-olive bg-natural-badge text-natural-text';
                }

                return (
                  <button
                    key={p.name}
                    onClick={() => loadPreset(p.values)}
                    className={`px-3 py-2.5 text-left rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      isActive 
                        ? activeStyle 
                        : `border-natural-border bg-natural-bg/40 text-natural-text/80 ${p.colorClass}`
                    }`}
                  >
                    <span className="block truncate font-serif italic text-sm">{p.name}</span>
                    <span className="font-mono text-[9px] text-natural-taupe font-normal block mt-0.5">
                      P: {p.values.petalLength} × {p.values.petalWidth}cm
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slider Group */}
          <div className="flex flex-col gap-6 pt-6 border-t border-natural-border/50">
            <h4 className="text-xs uppercase font-bold tracking-widest text-natural-olive mb-2">Sepal Parameters (cm)</h4>
            
            {/* Sepal Length */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-natural-text flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7D8471]" />
                  LENGTH
                </span>
                <span className="font-mono bg-natural-badge px-2.5 py-0.5 rounded-full text-natural-text text-xs font-semibold">{inputs.sepalLength.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min="4.3"
                max="7.9"
                step="0.1"
                value={inputs.sepalLength}
                onChange={e => handleSliderChange('sepalLength', parseFloat(e.target.value))}
                className="w-full accent-[#7D8471] cursor-pointer h-1 bg-natural-border rounded-full appearance-none"
              />
              <div className="flex justify-between text-[9px] text-natural-taupe font-mono mt-1">
                <span>Min: 4.3cm</span>
                <span>Max: 7.9cm</span>
              </div>
            </div>

            {/* Sepal Width */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-natural-text flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7D8471]" />
                  WIDTH
                </span>
                <span className="font-mono bg-natural-badge px-2.5 py-0.5 rounded-full text-natural-text text-xs font-semibold">{inputs.sepalWidth.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="4.4"
                step="0.1"
                value={inputs.sepalWidth}
                onChange={e => handleSliderChange('sepalWidth', parseFloat(e.target.value))}
                className="w-full accent-[#7D8471] cursor-pointer h-1 bg-natural-border rounded-full appearance-none"
              />
              <div className="flex justify-between text-[9px] text-natural-taupe font-mono mt-1">
                <span>Min: 2.0cm</span>
                <span>Max: 4.4cm</span>
              </div>
            </div>

            <h4 className="text-xs uppercase font-bold tracking-widest text-natural-rose pt-2 border-t border-natural-border/30 mb-2">Petal Parameters (cm)</h4>

            {/* Petal Length */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-natural-text flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C68B77]" />
                  LENGTH
                </span>
                <span className="font-mono bg-natural-badge px-2.5 py-0.5 rounded-full text-natural-text text-xs font-semibold">{inputs.petalLength.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.9"
                step="0.1"
                value={inputs.petalLength}
                onChange={e => handleSliderChange('petalLength', parseFloat(e.target.value))}
                className="w-full accent-[#C68B77] cursor-pointer h-1 bg-natural-border rounded-full appearance-none"
              />
              <div className="flex justify-between text-[9px] text-natural-taupe font-mono mt-1">
                <span>Min: 1.0cm</span>
                <span>Max: 6.9cm</span>
              </div>
            </div>

            {/* Petal Width */}
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium">
                <span className="text-natural-text flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C68B77]" />
                  WIDTH
                </span>
                <span className="font-mono bg-natural-badge px-2.5 py-0.5 rounded-full text-natural-text text-xs font-semibold">{inputs.petalWidth.toFixed(1)} cm</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.5"
                step="0.1"
                value={inputs.petalWidth}
                onChange={e => handleSliderChange('petalWidth', parseFloat(e.target.value))}
                className="w-full accent-[#C68B77] cursor-pointer h-1 bg-natural-border rounded-full appearance-none"
              />
              <div className="flex justify-between text-[9px] text-natural-taupe font-mono mt-1">
                <span>Min: 0.1cm</span>
                <span>Max: 2.5cm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="flex gap-3 items-start p-4 bg-natural-bg/50 rounded-2xl text-xs text-natural-muted mt-6 border border-natural-border/50">
          <HelpCircle className="w-4 h-4 text-natural-olive mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            Petals are generally much better features for distinguishing between <strong className="font-serif italic text-natural-text">versicolor</strong> and <strong className="font-serif italic text-natural-text">virginica</strong> than sepals. Setosa is distinctively smaller on both petal dimensions.
          </p>
        </div>
      </div>

      {/* Prediction Output Display */}
      <div id="results-panel" className="lg:col-span-5 flex flex-col gap-6">
        {/* Prediction Flower Card */}
        <div className="bg-white rounded-[40px] border border-natural-border/60 shadow-sm p-8 flex flex-col items-center text-center relative overflow-hidden group">
          {/* Subtle gradient light background */}
          <div className="absolute inset-0 bg-radial from-[#F4F1EA]/40 to-transparent pointer-events-none" />

          <span className="text-[10px] font-bold uppercase tracking-widest text-natural-rose bg-natural-badge/60 px-3 py-1 rounded-full mb-6 relative z-10 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-natural-rose" />
            Classification Result
          </span>

          {/* Render botanical image illustration */}
          <div className="w-44 h-44 rounded-full overflow-hidden bg-natural-bg/30 border border-natural-border relative mb-6 flex items-center justify-center p-1.5 shadow-xs">
            <img
              src={pImage}
              alt={pDetails.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full scale-100 group-hover:scale-105 transition-all duration-700"
            />
          </div>

          <h2 className="text-4xl font-serif text-natural-text leading-tight mb-3 relative z-10">
            Iris <span className="italic font-normal" style={{ color: pDetails.color }}>{pDetails.name.split(' ')[1]}</span>
          </h2>

          <p className="text-sm text-natural-muted leading-relaxed max-w-sm px-2 relative z-10">
            {pDetails.description}
          </p>

          <div className="mt-6 pt-6 border-t border-natural-border/40 w-full grid grid-cols-2 text-xs text-natural-taupe font-mono">
            <div className="border-r border-natural-border/40 pr-2">
              <span className="uppercase text-[9px] tracking-wider text-natural-taupe font-bold">Sepal Range</span>
              <span className="block font-semibold text-natural-text text-[10px] truncate mt-1">{pDetails.typicalRange.split('|')[0].replace('Sepal: ', '')}</span>
            </div>
            <div className="pl-2">
              <span className="uppercase text-[9px] tracking-wider text-natural-taupe font-bold">Petal Range</span>
              <span className="block font-semibold text-natural-text text-[10px] truncate mt-1">{pDetails.typicalRange.split('|')[1].replace('Petal: ', '')}</span>
            </div>
          </div>
        </div>

        {/* Probability Confidences */}
        <div className="bg-white rounded-[32px] border border-natural-border/60 shadow-sm p-8">
          <h4 className="text-xs font-bold uppercase tracking-widest text-natural-olive mb-5">Class Confidences</h4>

          <div className="flex flex-col gap-4">
            {(Object.keys(confidences) as Species[]).map(s => {
              const confidence = confidences[s];
              const details = SPECIES_DETAILS[s];
              const percentage = Math.round(confidence * 100);

              return (
                <div key={s}>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-natural-text flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: details.color }} />
                      <span className="font-serif italic text-[13px]">{details.name}</span>
                    </span>
                    <span className="font-mono font-bold text-natural-text">{percentage}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-natural-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: details.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
