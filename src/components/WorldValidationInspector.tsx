import React, { useEffect, useState } from 'react';
import { NormalizedBuilding, WorldCompileReport } from '../core/geoTypes';
import { X, Database, ShieldCheck, AlertCircle, Layers, Mountain, Navigation } from 'lucide-react';

interface WorldValidationInspectorProps {
  selectedBuilding: NormalizedBuilding | null;
  onCloseBuilding: () => void;
  compileReport: WorldCompileReport | null;
  onSelectBuildingById?: (id: string | number) => void;
}

export const WorldValidationInspector: React.FC<WorldValidationInspectorProps> = ({
  selectedBuilding,
  onCloseBuilding,
  compileReport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'legend' | 'building'>('stats');

  // Keyboard shortcut: F3 to toggle Developer World Inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If a building is selected, switch to building tab and open if not opened
  useEffect(() => {
    if (selectedBuilding) {
      setActiveTab('building');
      setIsOpen(true);
    }
  }, [selectedBuilding]);

  return (
    <>
      {/* Floating Toggle Button (Top Right, next to Compass) */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`interactive-ui absolute top-20 right-4 z-30 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold shadow-lg transition-all border ${
          isOpen
            ? 'bg-emerald-600 text-white shadow-emerald-500/40 border-emerald-400 ring-2 ring-emerald-300'
            : 'bg-slate-900/85 hover:bg-slate-900 text-slate-200 border-slate-700/80 backdrop-blur-md'
        }`}
        title="Toggle World Reconstruction Inspector (F3)"
      >
        <ShieldCheck size={16} className={isOpen ? 'text-white' : 'text-emerald-400'} />
        <span>World Inspector</span>
        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-700">
          F3
        </span>
      </button>

      {/* Main Inspector HUD Window */}
      {isOpen && (
        <div className="interactive-ui absolute top-32 right-4 z-40 w-96 max-h-[80vh] overflow-hidden flex flex-col bg-slate-950/95 text-white backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/80 font-sans select-text animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-emerald-400" />
              <div>
                <h3 className="text-xs font-bold tracking-wider uppercase text-emerald-400">
                  World Foundation & Compiler
                </h3>
                <p className="text-[10px] text-slate-400">OSM Reconstruction & DEM Grounding</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-900/30 text-xs font-medium">
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-2 px-3 text-center transition-colors border-b-2 ${
                activeTab === 'stats'
                  ? 'border-emerald-500 text-emerald-400 font-bold bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              World Stats
            </button>
            <button
              onClick={() => setActiveTab('legend')}
              className={`flex-1 py-2 px-3 text-center transition-colors border-b-2 ${
                activeTab === 'legend'
                  ? 'border-emerald-500 text-emerald-400 font-bold bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Color Rules
            </button>
            <button
              onClick={() => setActiveTab('building')}
              className={`flex-1 py-2 px-3 text-center transition-colors border-b-2 ${
                activeTab === 'building'
                  ? 'border-emerald-500 text-emerald-400 font-bold bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Building {selectedBuilding ? '•' : ''}
            </button>
          </div>

          {/* Tab 1: World Stats */}
          {activeTab === 'stats' && (
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {compileReport ? (
                <>
                  {/* Top Metric Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">Compiled in 3D</div>
                      <div className="text-xl font-black text-emerald-400 mt-1 flex items-baseline gap-1">
                        {compileReport.buildingsScanned - compileReport.buildingsRejected}
                        <span className="text-[11px] text-slate-500 font-normal">
                          / {compileReport.buildingsScanned} found
                        </span>
                      </div>
                    </div>
                    <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      <div className="text-[11px] text-slate-400 font-medium">Road Setbacks</div>
                      <div className="text-xl font-black text-rose-400 mt-1">
                        {compileReport.roadConflicts}
                        <span className="text-[10px] text-emerald-400 font-bold ml-1.5 bg-emerald-950/60 px-1 py-0.5 rounded border border-emerald-800/60">
                          CLEARED
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400">Water Excluded</div>
                      <div className="text-sm font-bold text-sky-400 mt-0.5">
                        {compileReport.waterConflicts}
                      </div>
                    </div>
                    <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400">Railway Safe</div>
                      <div className="text-sm font-bold text-amber-400 mt-0.5">
                        {compileReport.railwayConflicts}
                      </div>
                    </div>
                    <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 text-center">
                      <div className="text-[10px] text-slate-400">Overlaps Fixed</div>
                      <div className="text-sm font-bold text-purple-400 mt-0.5">
                        {compileReport.overlapsCorrected}
                      </div>
                    </div>
                  </div>

                  {/* Terrain & DEM Status */}
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-slate-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Mountain size={14} className="text-emerald-400" />
                        Topography & DEM Zone
                      </span>
                      <span className="text-emerald-400 text-[11px] font-mono capitalize">
                        {compileReport.terrainConflicts} conflicts
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Trees Excluded:</span>
                      <span className="text-slate-200 font-mono font-bold">
                        {compileReport.treeConflicts} instances
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Ground Plinth Policy:</span>
                      <span className="text-slate-200 font-mono">Stepped Masonry (Auto-depth)</span>
                    </div>
                  </div>

                  {/* Category Breakdown */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                      <Layers size={13} className="text-slate-400" />
                      Compiled Categories
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] max-h-36 overflow-y-auto pr-1">
                      {Object.entries(compileReport.categoriesCount)
                        .filter(([, count]) => count > 0)
                        .map(([category, count]) => (
                          <div
                            key={category}
                            className="flex items-center justify-between bg-slate-900/50 px-2.5 py-1.5 rounded-lg border border-slate-800/80"
                          >
                            <span className="text-slate-400 truncate">{category}</span>
                            <span className="font-mono text-slate-200 font-bold ml-2">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Database size={28} className="mx-auto text-slate-600 mb-2 animate-pulse" />
                  <p>Awaiting world compile pass...</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Color Rules & Priority Hierarchy */}
          {activeTab === 'legend' && (
            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-200">Layering Priority:</span> WATER &gt; ROAD &gt; RAILWAY &gt; BUILDING &gt; DECORATION.
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 mt-0.5 shrink-0 shadow-sm shadow-emerald-500/50" />
                  <div>
                    <div className="font-bold text-emerald-400">Green: Clean Valid Structure</div>
                    <div className="text-[10px] text-slate-400">
                      Footprint complies with all road setbacks, water masks, and railway safety clearances.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-3 h-3 rounded-full bg-rose-500 mt-0.5 shrink-0 shadow-sm shadow-rose-500/50" />
                  <div>
                    <div className="font-bold text-rose-400">Red: Road Conflict Resolved</div>
                    <div className="text-[10px] text-slate-400">
                      Raw OSM footprint encroached on drivable road. Automatically shifted along outward normal with 3.5m clearance.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-3 h-3 rounded-full bg-sky-500 mt-0.5 shrink-0 shadow-sm shadow-sky-500/50" />
                  <div>
                    <div className="font-bold text-sky-400">Blue: Water Conflict Handled</div>
                    <div className="text-[10px] text-slate-400">
                      Submerged building relocated to dry shoreline or excluded from river/lake bed.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-3 h-3 rounded-full bg-amber-500 mt-0.5 shrink-0 shadow-sm shadow-amber-500/50" />
                  <div>
                    <div className="font-bold text-amber-400">Orange: Railway Clearance Setback</div>
                    <div className="text-[10px] text-slate-400">
                      Building maintained 6.0m buffer from active railway tracks or viaducts.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 mt-0.5 shrink-0 shadow-sm shadow-yellow-500/50" />
                  <div>
                    <div className="font-bold text-yellow-400">Yellow: Unknown / Generic Class</div>
                    <div className="text-[10px] text-slate-400">
                      Unclassified polygon given standard Kerala residential or commercial facade.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="w-3 h-3 rounded-full bg-purple-500 mt-0.5 shrink-0 shadow-sm shadow-purple-500/50" />
                  <div>
                    <div className="font-bold text-purple-400">Purple: Geometry Repaired</div>
                    <div className="text-[10px] text-slate-400">
                      Inverted winding repaired to CCW, or degenerate collinear vertices removed.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Selected Building Inspector */}
          {activeTab === 'building' && (
            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              {selectedBuilding ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {selectedBuilding.name || 'Unnamed Building'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        OSM ID: #{selectedBuilding.id}
                      </div>
                    </div>
                    <button
                      onClick={onCloseBuilding}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Category</div>
                      <div className="font-bold text-sky-400 mt-0.5">{selectedBuilding.category}</div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400">Model Family</div>
                      <div className="font-bold text-purple-400 mt-0.5">{selectedBuilding.modelFamily}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                      <div className="text-[9px] text-slate-400">Height</div>
                      <div className="font-mono font-bold text-slate-200">
                        {selectedBuilding.height.toFixed(1)} m
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                      <div className="text-[9px] text-slate-400">Elevation</div>
                      <div className="font-mono font-bold text-emerald-400">
                        {(selectedBuilding.elevation ?? 0).toFixed(1)} m
                      </div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                      <div className="text-[9px] text-slate-400">Plinth Depth</div>
                      <div className="font-mono font-bold text-amber-400">
                        {(selectedBuilding.foundationDepth ?? 0.6).toFixed(1)} m
                      </div>
                    </div>
                  </div>

                  {/* Validation Status */}
                  <div
                    className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                      selectedBuilding.validationStatus === 'clean'
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                    }`}
                  >
                    {selectedBuilding.validationStatus === 'clean' ? (
                      <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                    ) : (
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    )}
                    <div>
                      <div className="font-bold capitalize">
                        {selectedBuilding.validationStatus} Placement
                      </div>
                      <div className="text-[10px] opacity-90 mt-0.5">
                        {selectedBuilding.conflictDetails || 'Passes all road, water, and building clearance checks.'}
                      </div>
                    </div>
                  </div>

                  {/* Raw OSM Tags */}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      OpenStreetMap Metadata Tags ({Object.keys(selectedBuilding.tags || {}).length})
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                      {Object.entries(selectedBuilding.tags || {}).map(([key, val]) => (
                        <div key={key} className="flex items-baseline justify-between text-[10px] font-mono">
                          <span className="text-slate-400 truncate mr-2">{key}:</span>
                          <span className="text-slate-200 truncate">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 text-slate-400">
                  <Navigation size={24} className="mx-auto text-slate-600 mb-2" />
                  <p>Click any 3D building in the game world to inspect its real geographic footprint and tags.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
