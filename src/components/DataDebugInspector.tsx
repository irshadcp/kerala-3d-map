import React from 'react';
import { NormalizedBuilding, ValidationReport } from '../core/geoTypes';
import { X, CheckCircle, AlertTriangle, Database, Tag, Eye } from 'lucide-react';

interface DataDebugInspectorProps {
  selectedBuilding: NormalizedBuilding | null;
  onClose: () => void;
  validationReport: ValidationReport | null;
  isDebugModeActive: boolean;
  onToggleDebugMode: () => void;
}

export const DataDebugInspector: React.FC<DataDebugInspectorProps> = ({
  selectedBuilding,
  onClose,
  validationReport,
  isDebugModeActive,
  onToggleDebugMode,
}) => {
  return (
    <>
      {/* Toggle Button in Top Right */}
      <button
        onClick={onToggleDebugMode}
        className={`interactive-ui absolute top-20 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-all ${
          isDebugModeActive
            ? 'bg-purple-600 text-white shadow-purple-500/40 ring-2 ring-purple-300'
            : 'bg-white/90 text-slate-700 hover:bg-white border border-slate-200'
        }`}
        title="Toggle Map Data Debug Mode (F2)"
      >
        <Eye size={14} />
        <span>{isDebugModeActive ? 'Debug Mode: ON' : 'Data Inspector'}</span>
      </button>

      {/* Floating Inspector Dialog */}
      {selectedBuilding && (
        <div className="interactive-ui absolute bottom-6 right-6 z-40 w-96 max-h-[82vh] overflow-y-auto bg-slate-900/95 text-white backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/80 p-5 font-sans select-text">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold tracking-wide">Building Data Inspector</h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Primary Details */}
          <div className="mt-4 space-y-3 text-xs">
            {/* Name / ID */}
            <div>
              <div className="text-slate-400 font-medium">Name & ID</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedBuilding.name || 'Unnamed Structure'}</span>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                  #{selectedBuilding.id}
                </span>
              </div>
            </div>

            {/* Category & Model Family */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-[11px]">Category</div>
                <div className="font-bold text-sky-400 mt-0.5">{selectedBuilding.category}</div>
              </div>
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-[11px]">Model Family</div>
                <div className="font-bold text-emerald-400 mt-0.5">{selectedBuilding.modelFamily}</div>
              </div>
            </div>

            {/* Geometry & Dimensions */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-800/50 p-2 rounded-lg">
                <div className="text-slate-400 text-[10px]">Height</div>
                <div className="font-semibold text-white">{selectedBuilding.height.toFixed(1)}m</div>
              </div>
              <div className="bg-slate-800/50 p-2 rounded-lg">
                <div className="text-slate-400 text-[10px]">Area</div>
                <div className="font-semibold text-white">{Math.round(selectedBuilding.areaSqMeters)} m²</div>
              </div>
              <div className="bg-slate-800/50 p-2 rounded-lg">
                <div className="text-slate-400 text-[10px]">Vertices</div>
                <div className="font-semibold text-white">{selectedBuilding.coordinates.length} pts</div>
              </div>
            </div>

            {/* Geographic Coordinates */}
            <div className="bg-slate-800/40 p-2.5 rounded-xl text-[11px] font-mono text-slate-300">
              <div>Lat: {selectedBuilding.centerLat.toFixed(6)}</div>
              <div>Lng: {selectedBuilding.centerLng.toFixed(6)}</div>
              <div>Local (X, Z): ({selectedBuilding.centerX.toFixed(1)}m, {selectedBuilding.centerZ.toFixed(1)}m)</div>
            </div>

            {/* Validation & Conflict Status */}
            <div className="p-2.5 rounded-xl border flex items-start gap-2 text-[11px] bg-slate-800/60 border-slate-700">
              {selectedBuilding.validationStatus === 'clean' ? (
                <>
                  <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-emerald-400">Road Corridor: Valid</span>
                    <p className="text-slate-400 text-[10px] mt-0.5">Footprint is clear of road corridors.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-400">Road Adjustment Applied</span>
                    <p className="text-slate-400 text-[10px] mt-0.5">{selectedBuilding.conflictDetails}</p>
                  </div>
                </>
              )}
            </div>

            {/* Source Raw OSM Tags */}
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 font-medium mb-1.5">
                <Tag size={12} />
                <span>Raw Source Tags ({Object.keys(selectedBuilding.tags).length})</span>
              </div>
              <div className="max-h-36 overflow-y-auto bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 text-[11px] font-mono space-y-1">
                {Object.keys(selectedBuilding.tags).length === 0 ? (
                  <span className="text-slate-500 italic">No explicit OSM tags (building=yes)</span>
                ) : (
                  Object.entries(selectedBuilding.tags).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-800/50 pb-0.5">
                      <span className="text-purple-300">{k}:</span>
                      <span className="text-slate-300 max-w-[170px] truncate text-right">{v}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Validation Summary Footer */}
          {validationReport && (
            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>World Generated: {validationReport.buildingsGenerated}</span>
              <span>Conflicts Resolved: {validationReport.roadConflictsResolved}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
};
