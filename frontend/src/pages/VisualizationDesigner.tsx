import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Sparkles, Clock, X, AlertCircle } from "lucide-react";
import clsx from "clsx";
import { QueryBuilder } from "../components/QueryBuilder";
import { useQueryBuilderStore } from "../store/queryBuilderStore";
import { visualizationService } from "../services/visualizationService";

export default function VisualizationDesigner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visualizationName, setVisualizationName] = useState(
    "Untitled Visualization"
  );
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const { databaseId, buildMBQLQuery, queryResult, reset } =
    useQueryBuilderStore();

  const handleSave = useCallback(async () => {
    if (!databaseId) {
      setSaveError("Please add at least one table to create a visualization");
      return;
    }

    const query = buildMBQLQuery();
    if (!query) {
      setSaveError("Please add tables and select columns");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await visualizationService.create({
        name: visualizationName,
        description: description || undefined,
        database_id: databaseId,
        query_type: "mbql",
        mbql_query: query as object,
        visualization_type: "table",
      });
      reset();
      navigate("/visualizations");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save visualization"
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    databaseId,
    buildMBQLQuery,
    visualizationName,
    description,
    navigate,
    reset,
  ]);

  const openSaveModal = () => {
    if (!databaseId) {
      setSaveError("Please add at least one table to create a visualization");
      return;
    }
    setShowSaveModal(true);
  };

  return (
    <div className="min-h-screen -m-4 lg:-m-6 flex flex-col bg-gray-50">
      {/* Modern Toolbar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                reset();
                navigate(-1);
              }}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {id ? "Edit Visualization" : "Query Builder"}
                </h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Build queries visually, create insights</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {saveError && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span className="max-w-xs truncate">{saveError}</span>
              </div>
            )}
            <button
              onClick={openSaveModal}
              disabled={!queryResult}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-all",
                queryResult
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" />
              Save Visualization
            </button>
          </div>
        </div>
      </div>

      {/* QueryBuilder */}
      <div className="flex-1">
        <QueryBuilder />
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Save Visualization
                  </h3>
                </div>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={visualizationName}
                  onChange={(e) => setVisualizationName(e.target.value)}
                  placeholder="Enter visualization name"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:bg-white transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description for this visualization"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:bg-white transition-all resize-none"
                />
              </div>

              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {saveError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !visualizationName.trim()}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2 font-medium rounded-xl transition-all",
                  !isSaving && visualizationName.trim()
                    ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
