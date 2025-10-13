import { useState } from 'react';

export interface ModalState {
  shareModalOpen: boolean;
  infoModalOpen: boolean;
  printModalOpen: boolean;
  showPDFViewer: boolean;
}

export interface ModalActions {
  setShareModalOpen: (open: boolean) => void;
  setInfoModalOpen: (open: boolean) => void;
  setPrintModalOpen: (open: boolean) => void;
  setShowPDFViewer: (open: boolean) => void;
  openShareModal: () => void;
  openInfoModal: () => void;
  openPrintModal: () => void;
  openPDFViewer: () => void;
  closeAllModals: () => void;
}

export function useModalManagement(): ModalState & ModalActions {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  const openShareModal = () => setShareModalOpen(true);
  const openInfoModal = () => setInfoModalOpen(true);
  const openPrintModal = () => setPrintModalOpen(true);
  const openPDFViewer = () => setShowPDFViewer(true);

  const closeAllModals = () => {
    setShareModalOpen(false);
    setInfoModalOpen(false);
    setPrintModalOpen(false);
    setShowPDFViewer(false);
  };

  return {
    shareModalOpen,
    infoModalOpen,
    printModalOpen,
    showPDFViewer,
    setShareModalOpen,
    setInfoModalOpen,
    setPrintModalOpen,
    setShowPDFViewer,
    openShareModal,
    openInfoModal,
    openPrintModal,
    openPDFViewer,
    closeAllModals
  };
}
