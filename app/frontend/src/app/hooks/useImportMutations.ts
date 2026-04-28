import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  previewImport,
  runImport,
  type ImportPreviewRequestApi,
  type ImportPreviewResponseApi,
  type ImportRunRequestApi,
  type ImportRunResponseApi,
} from '../lib/importsApi';

export function useImportPreviewMutation() {
  return useMutation<ImportPreviewResponseApi, Error, ImportPreviewRequestApi>({
    mutationFn: (payload) => previewImport(payload),
  });
}

export function useRunImportMutation() {
  const qc = useQueryClient();

  return useMutation<ImportRunResponseApi, Error, ImportRunRequestApi>({
    mutationFn: (payload) => runImport(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['activity'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
