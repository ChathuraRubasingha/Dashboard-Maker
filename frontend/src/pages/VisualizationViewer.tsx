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
  BarChart3,
  Clock,
  Check,
  X,
} from "lucide-react";
import clsx from "clsx";
import { visualizationService } from "../services/visualizationService";
import { metabaseService } from "../services/metabaseService";
import ChartRenderer from "../components/ChartRenderer";
import CustomizationPanel from "../components/CustomizationPanel";
import { DeleteConfirmDialog } from "../components/ui/ConfirmDialog";
import { useToast } from "../components/ui/Toast";
import type {
  VisualizationType,
  VisualizationCustomization,
  QueryResult,
} from "../types";

export default function VisualizationViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

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
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      toast.success('Visualization deleted', 'The visualization has been permanently removed');
      navigate("/visualizations");
    },
    onError: () => {
      toast.error('Failed to delete', 'Could not delete the visualization');
      setIsDeleting(false);
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
    setShowDeleteDialog(true);
    setShowMenu(false);
  };

  const confirmDelete = () => {
    setIsDeleting(true);
    deleteMutation.mutate();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMenu(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-4">Loading visualization...</p>
      </div>
    );
  }

  if (error || !visualization) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-2">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Visualization not found</h2>
        <p className="text-gray-500">
          {error instanceof Error ? error.message : "The visualization you're looking for doesn't exist."}
        </p>
        <Link
          to="/visualizations"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
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
      {/* Modern Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/visualizations")}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
              title="Back to visualizations"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
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
                {visualization.description ? (
                  <p className="text-xs text-gray-500 truncate max-w-md">
                    {visualization.description}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>Created recently</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                Unsaved changes
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={executeQuery}
              disabled={isExecuting}
              className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-600 disabled:opacity-50 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={clsx("w-5 h-5", isExecuting && "animate-spin")} />
            </button>

            {/* Toggle Query View */}
            <button
              onClick={() => setShowQuery(!showQuery)}
              className={clsx(
                "p-2.5 rounded-xl transition-colors",
                showQuery
                  ? "bg-gray-800 text-white"
                  : "hover:bg-gray-100 text-gray-600"
              )}
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
              className={clsx(
                "p-2.5 rounded-xl transition-colors",
                showCustomization
                  ? "bg-emerald-600 text-white"
                  : "hover:bg-gray-100 text-gray-600"
              )}
              title="Customize appearance"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Save Changes */}
            {hasUnsavedChanges && (
              <button
                onClick={() => saveCustomizationMutation.mutate()}
                disabled={saveCustomizationMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 shadow-lg shadow-emerald-500/25 transition-all"
              >
                {saveCustomizationMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Changes
              </button>
            )}

            {/* Edit Button */}
            <button
              onClick={() => navigate(`/visualizations/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-600 transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement export
                        setShowMenu(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="w-4 h-4" />
                      Export Data
                    </button>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
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
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Query (Read-Only)
            </span>
            {visualization.is_query_locked && (
              <Lock className="w-3 h-3 text-amber-400" />
            )}
          </div>
          <pre className="text-sm text-emerald-400 overflow-x-auto font-mono max-h-48 overflow-y-auto bg-gray-800/50 rounded-xl p-4">
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
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
              <X className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{executeError}</span>
              <button
                onClick={() => setExecuteError(null)}
                className="ml-auto p-1.5 hover:bg-red-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* View Type Selector */}
          <div className="mb-4 flex items-center gap-4">
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
              {(
                ["table", "bar", "line", "area", "pie"] as VisualizationType[]
              ).map((type) => (
                <button
                  key={type}
                  onClick={() => handleViewTypeChange(type)}
                  className={clsx(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize",
                    viewType === type
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            {queryResult && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                {queryResult.row_count} row{queryResult.row_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Chart/Table Display */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-280px)]">
            {isExecuting ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
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
                    customLabels={localCustomization.custom_labels || {}}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 mb-2">No data available</p>
                <p className="text-sm text-gray-500 mb-4">Run the query to see your data</p>
                <button
                  onClick={executeQuery}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
                >
                  <RefreshCw className="w-4 h-4" />
                  Run Query
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Customization Sidebar */}
        {showCustomization && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <Settings className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Customize</h3>
                </div>
                <button
                  onClick={() => setShowCustomization(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Customize colors, labels, and display options
              </p>
            </div>
            <div className="p-4">
              <CustomizationPanel
                customization={localCustomization}
                visualizationType={viewType}
                onChange={handleCustomizationChange}
                columns={queryResult?.data?.cols || []}
              />
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        itemName={visualization?.name}
        itemType="visualization"
        isLoading={isDeleting}
      />
    </div>
  );
}
