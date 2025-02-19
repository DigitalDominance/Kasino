"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { AccountCreation } from "@/components/account-creation"
import { Login } from "@/components/login"

type ModalType = "account-creation" | "login" | null

interface ModalContextType {
  showModal: (type: ModalType, walletAddress?: string) => void
  hideModal: () => void
  currentModal: ModalType
  modalProps: {
    walletAddress?: string
  }
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [currentModal, setCurrentModal] = useState<ModalType>(null)
  const [modalProps, setModalProps] = useState<{ walletAddress?: string }>({})

  const showModal = (type: ModalType, walletAddress?: string) => {
    setCurrentModal(type)
    setModalProps({ walletAddress })
  }

  const hideModal = () => {
    setCurrentModal(null)
    setModalProps({})
  }

  return (
    <ModalContext.Provider value={{ showModal, hideModal, currentModal, modalProps }}>
      {children}
      {currentModal === "account-creation" && modalProps.walletAddress && (
        <AccountCreation onClose={hideModal} walletAddress={modalProps.walletAddress} />
      )}
      {currentModal === "login" && modalProps.walletAddress && (
        <Login onClose={hideModal} walletAddress={modalProps.walletAddress} />
      )}
    </ModalContext.Provider>
  )
}

export const useModal = () => {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider")
  }
  return context
}

