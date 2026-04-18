const fs = require('fs');
let content = fs.readFileSync('src/pages/shared/Chat.tsx', 'utf8');
const exportIndex = content.indexOf('export default function Chat() {');
const newTop = `import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useChat } from '../../hooks/useChat'
import { ChatCanal, chatService } from '../../services/chatService'
import {
  MessageSquare, Plus, X, Send, Image as ImageIcon,
  Trash2, ChevronDown, Pencil, ArrowLeft
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { ConfirmButton } from '../../components/ui/ConfirmButton'
import { motion, AnimatePresence } from 'framer-motion'
import { formatHeure, formatDate, getCanalLabel, getCanalIcon, getInitiales } from '../../components/chat/ChatUtils'
import { RuneFond } from '../../components/chat/RuneFond'
import { NouvelleConvModal, ModifierCanalModal } from '../../components/chat/ChatModals'

`;
fs.writeFileSync('src/pages/shared/Chat.tsx', newTop + content.substring(exportIndex));
