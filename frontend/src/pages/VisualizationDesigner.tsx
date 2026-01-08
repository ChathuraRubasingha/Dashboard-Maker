import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
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
      {/* Toolbar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                reset();
                navigate(-1);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {id ? "Edit Visualization" : "New Visualization"}
              </h1>
              <p className="text-xs text-gray-500">
                Drag tables to the canvas, connect them with joins, and select
                columns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveError && (
              <span className="text-sm text-red-600 mr-2">{saveError}</span>
            )}
            <button
              onClick={openSaveModal}
              disabled={!queryResult}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSaveModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Save Visualization
              </h3>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={visualizationName}
                  onChange={(e) => setVisualizationName(e.target.value)}
                  placeholder="Enter visualization name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description for this visualization"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {saveError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {saveError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !visualizationName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
