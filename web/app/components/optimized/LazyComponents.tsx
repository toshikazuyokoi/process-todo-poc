import dynamic from 'next/dynamic';
import { ComponentType, ReactElement } from 'react';

// Loading component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// TODO: Implement these components when needed
// Currently commented out to prevent build errors

// // Gantt Chart - Heavy component, lazy load
// export const GanttChart = dynamic(
//   () => import('../gantt/GanttChart').then((mod) => mod.GanttChart),
//   {
//     loading: () => <LoadingSpinner />,
//     ssr: false, // Client-side only
//   }
// );

// // Calendar View - Heavy component, lazy load
// export const CalendarView = dynamic(
//   () => import('../calendar/CalendarView').then((mod) => mod.CalendarView),
//   {
//     loading: () => <LoadingSpinner />,
//     ssr: false,
//   }
// );

// // File Upload - Used only in specific forms
// export const FileUpload = dynamic(
//   () => import('../forms/FileUpload').then((mod) => mod.FileUpload),
//   {
//     loading: () => <LoadingSpinner />,
//   }
// );

// // Rich Text Editor - Heavy component
// export const RichTextEditor = dynamic(
//   () => import('../editor/RichTextEditor').then((mod) => mod.RichTextEditor),
//   {
//     loading: () => <LoadingSpinner />,
//     ssr: false,
//   }
// );

// // Data Table with sorting and filtering
// export const DataTable = dynamic(
//   () => import('../table/DataTable').then((mod) => mod.DataTable),
//   {
//     loading: () => <LoadingSpinner />,
//   }
// );

// // Analytics Dashboard
// export const AnalyticsDashboard = dynamic(
//   () => import('../analytics/Dashboard').then((mod) => mod.Dashboard),
//   {
//     loading: () => <LoadingSpinner />,
//     ssr: false,
//   }
// );

// // Modal Components - Load on demand
// export const TemplateModal = dynamic(
//   () => import('../modals/TemplateModal').then((mod) => mod.TemplateModal),
//   {
//     loading: () => null,
//   }
// );

// export const CaseModal = dynamic(
//   () => import('../modals/CaseModal').then((mod) => mod.CaseModal),
//   {
//     loading: () => null,
//   }
// );

// // Export modal - Heavy due to export logic
// export const ExportModal = dynamic(
//   () => import('../modals/ExportModal').then((mod) => mod.ExportModal),
//   {
//     loading: () => <LoadingSpinner />,
//   }
// );

// // Charts - Load on demand
// export const ProgressChart = dynamic(
//   () => import('../charts/ProgressChart').then((mod) => mod.ProgressChart),
//   {
//     loading: () => <LoadingSpinner />,
//     ssr: false,
//   }
// );

// export const TimelineChart = dynamic(
//   () => import('../charts/TimelineChart').then((mod) => mod.TimelineChart),
//   {
//     loading: () => <LoadingSpinner />,
//     ssr: false,
//   }
// );

// // PDF Viewer - Heavy component
// export const PDFViewer = dynamic(
//   () => import('../viewers/PDFViewer').then((mod) => mod.PDFViewer),
//   {
//     loading: () => <LoadingSpinner />,
//     ssr: false,
//   }
// );

// // Image Gallery - Load on demand
// export const ImageGallery = dynamic(
//   () => import('../gallery/ImageGallery').then((mod) => mod.ImageGallery),
//   {
//     loading: () => <LoadingSpinner />,
//   }
// );

// // Notification Center - Load on demand
// export const NotificationCenter = dynamic(
//   () => import('../notifications/NotificationCenter').then((mod) => mod.NotificationCenter),
//   {
//     loading: () => null,
//   }
// );

// // Settings Panel - Load on demand
// export const SettingsPanel = dynamic(
//   () => import('../settings/SettingsPanel').then((mod) => mod.SettingsPanel),
//   {
//     loading: () => <LoadingSpinner />,
//   }
// );

// Helper function to create lazy loaded component
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T } | { [key: string]: T }>,
  exportName?: string,
  options?: {
    loading?: () => ReactElement | null;
    ssr?: boolean;
  }
) {
  return dynamic(
    async () => {
      const module = await importFunc();
      if (exportName && exportName in module) {
        return { default: (module as any)[exportName] };
      }
      return module as { default: T };
    },
    {
      loading: options?.loading || (() => <LoadingSpinner />),
      ssr: options?.ssr !== false,
    }
  );
}