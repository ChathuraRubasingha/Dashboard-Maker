import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Edit2,
  RefreshCw,
  Lock,
  MoreVertical,
  Trash2,
  Copy,
  Download,
  Settings,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";
import { visualizationService } from "../services/visualizationService";
import { metabaseService } from "../services/metabaseService";
import ChartRenderer from "../components/ChartRenderer";
import CustomizationPanel from "../components/CustomizationPanel";
import type {
  VisualizationType,
  VisualizationCustomization,
  QueryResult,
} from "../types";

export default function VisualizationViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showQuery, setShowQuery] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [localCustomization, setLocalCustomization] = useState<
    Partial<VisualizationCustomization>
  >({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewType, setViewType] = useState<VisualizationType>("table");

  // Fetch visualization
  const {
    data: visualization,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["visualization", id],
    queryFn: () => visualizationService.get(Number(id)),
    enabled: !!id,
  });

  // Initialize local state when visualization loads
  useEffect(() => {
    if (visualization) {
      setViewType(visualization.visualization_type);
      setLocalCustomization(visualization.customization || {});
    }
  }, [visualization]);

  // Execute query when visualization loads
  useEffect(() => {
    if (visualization && !queryResult && !isExecuting) {
      executeQuery();
    }
  }, [visualization]);

  // Execute the saved query
  const executeQuery = useCallback(async () => {
    if (!visualization) return;

    setIsExecuting(true);
    setExecuteError(null);

    try {
      let result: QueryResult;

      if (visualization.query_type === "mbql" && visualization.mbql_query) {
        // The mbql_query is stored as the full dataset query object
        // It may have { database, type, query } structure already
        const storedQuery = visualization.mbql_query as unknown as {
          database?: number;
          type?: string;
          query?: object;
        };

        if (storedQuery.database && storedQuery.query) {
          // Full query object format - send as is
          result = await metabaseService.executeQuery({
            database: storedQuery.database,
            type: "query",
            query: storedQuery.query as any,
          });
        } else {
          // Just the MBQL query part
          result = await metabaseService.executeQuery({
            database: visualization.database_id!,
            type: "query",
            query: visualization.mbql_query,
          });
        }
      } else if (
        visualization.query_type === "native" &&
        visualization.native_query
      ) {
        result = await metabaseService.executeNativeQuery(
          visualization.database_id!,
          visualization.native_query
        );
      } else {
        throw new Error("Invalid query configuration");
      }

      setQueryResult(result);
    } catch (err) {
      setExecuteError(
        err instanceof Error ? err.message : "Failed to execute query"
      );
    } finally {
      setIsExecuting(false);
    }
  }, [visualization]);

  // Save customization changes
  const saveCustomizationMutation = useMutation({
    mutationFn: async () => {
      if (!visualization) throw new Error("No visualization");

      // Update customization
      await visualizationService.updateCustomization(
        visualization.id,
        localCustomization
      );

      // Update visualization type if changed
      if (viewType !== visualization.visualization_type) {
        await visualizationService.update(visualization.id, {
          visualization_type: viewType,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visualization", id] });
      setHasUnsavedChanges(false);
    },
  });

  // Delete visualization
  const deleteMutation = useMutation({
    mutationFn: () => visualizationService.delete(Number(id)),
    onSuccess: () => {
      navigate("/visualizations");
    },
  });

  const handleCustomizationChange = (
    updates: Partial<VisualizationCustomization>
  ) => {
    setLocalCustomization(updates);
    setHasUnsavedChanges(true);
  };

  const handleViewTypeChange = (type: VisualizationType) => {
    setViewType(type);
    setHasUnsavedChanges(type !== visualization?.visualization_type);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this visualization?")) {
      deleteMutation.mutate();
    }
    setShowMenu(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">Loading visualization...</span>
        </div>
      </div>
    );
  }

  if (error || !visualization) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-red-500 text-lg">
          {error instanceof Error ? error.message : "Visualization not found"}
        </div>
        <Link
          to="/visualizations"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Visualizations
        </Link>
      </div>
    );
  }

  const customColors = localCustomization.custom_colors || [
    "#509EE3",
    "#88BF4D",
    "#A989C5",
    "#EF8C8C",
    "#F9D45C",
    "#F2A86F",
    "#98D9D9",
    "#7172AD",
  ];

  return (
    <div className="min-h-screen -m-4 lg:-m-6 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/visualizations")}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Back to visualizations"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">
                  {visualization.name}
                </h1>
                {visualization.is_query_locked && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                    <Lock className="w-3 h-3" />
                    Query Locked
                  </span>
                )}
              </div>
              {visualization.description && (
                <p className="text-xs text-gray-500">
                  {visualization.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <span className="text-sm text-amber-600 mr-2">
                Unsaved changes
              </span>
            )}

            {/* Refresh */}
            <button
              onClick={executeQuery}
              disabled={isExecuting}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw
                className={`w-5 h-5 ${isExecuting ? "animate-spin" : ""}`}
              />
            </button>

            {/* Toggle Query View */}
            <button
              onClick={() => setShowQuery(!showQuery)}
              className={`p-2 rounded-lg transition-colors ${
                showQuery
                  ? "bg-gray-800 text-white"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title={showQuery ? "Hide query" : "Show query"}
            >
              {showQuery ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>

            {/* Toggle Customization Panel */}
            <button
              onClick={() => setShowCustomization(!showCustomization)}
              className={`p-2 rounded-lg transition-colors ${
                showCustomization
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Customize appearance"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Save Changes */}
            {hasUnsavedChanges && (
              <button
                onClick={() => saveCustomizationMutation.mutate()}
                disabled={saveCustomizationMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saveCustomizationMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : null}
                Save Changes
              </button>
            )}

            {/* Edit Button */}
            <button
              onClick={() => navigate(`/visualizations/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement export
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="w-4 h-4" />
                      Export Data
                    </button>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Query Preview Panel */}
      {showQuery && visualization.mbql_query && (
        <div className="bg-gray-900 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Query (Read-Only)
            </span>
            {visualization.is_query_locked && (
              <Lock className="w-3 h-3 text-amber-400" />
            )}
          </div>
          <pre className="text-sm text-green-400 overflow-x-auto font-mono max-h-48 overflow-y-auto">
            {JSON.stringify(visualization.mbql_query, null, 2)}
          </pre>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Visualization Area */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          {/* Error Banner */}
          {executeError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">{executeError}</span>
              <button
                onClick={() => setExecuteError(null)}
                className="ml-auto p-1 hover:bg-red-100 rounded"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* View Type Selector */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              {(
                ["table", "bar", "line", "area", "pie"] as VisualizationType[]
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => handleViewTypeChange(type)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                    viewType === type
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {queryResult && (
              <span className="text-sm text-gray-500">
                {queryResult.row_count} row
                {queryResult.row_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Chart/Table Display */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-280px)]">
            {isExecuting ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <span className="text-gray-500">Executing query...</span>
              </div>
            ) : queryResult ? (
              <div className="p-6 h-full flex flex-col">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {visualization.name}
                  </h2>
                  {visualization.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {visualization.description}
                    </p>
                  )}
                </div>
                <div className="flex-1 min-h-0">
                  <ChartRenderer
                    type={viewType}
                    data={queryResult}
                    colors={customColors}
                    showLegend={localCustomization.show_legend !== false}
                    showGrid={localCustomization.show_grid !== false}
                    xAxisLabel={localCustomization.x_axis_label || undefined}
                    yAxisLabel={localCustomization.y_axis_label || undefined}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>No data available</p>
                <button
                  onClick={executeQuery}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Run Query
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Customization Sidebar */}
        {showCustomization && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Customize</h3>
                <button
                  onClick={() => setShowCustomization(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Customize colors, labels, and display options
              </p>
            </div>
            <div className="p-4">
              <CustomizationPanel
                customization={localCustomization}
                visualizationType={viewType}
                onChange={handleCustomizationChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
