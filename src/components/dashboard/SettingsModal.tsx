import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/store/uiStore'

export function SettingsModal() {
    const { isSettingsOpen, closeSettings, apiKey, setApiKey, showToast } = useUIStore()
    const [inputKey, setInputKey] = useState('')
    const [isVisible, setIsVisible] = useState(false)

    // Sync state with store on open
    useEffect(() => {
        if (isSettingsOpen) {
            setInputKey(apiKey || '')
        }
    }, [isSettingsOpen, apiKey])

    const handleSave = () => {
        if (!inputKey.trim()) {
            showToast('Please enter a valid API key', 'error')
            return
        }

        // Basic format check (optional, Gemini keys usually start with AIza)
        if (!inputKey.startsWith('AIza')) {
            showToast('That doesn\'t look like a valid Gemini API key', 'warning')
            // We still allow it to be saved just in case format changes
        }

        setApiKey(inputKey)
        showToast('API Key saved successfully!', 'success')
        closeSettings()
    }

    const handleClear = () => {
        setApiKey(null)
        setInputKey('')
        showToast('API Key removed', 'info')
    }

    return (
        <Modal
            isOpen={isSettingsOpen}
            onClose={closeSettings}
            title="Settings"
            size="md"
        >
            <div className="space-y-6 py-2">
                <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">AI Configuration</h3>
                    <p className="text-sm text-secondary-foreground mb-4">
                        To use AI features (Parsing, Tips, Syllabus), you need to provide your own Google Gemini API Key.
                        The key is stored locally in your browser and is never saved to our servers.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="apiKey" className="block text-sm font-medium text-foreground mb-1">
                                Gemini API Key
                            </label>
                            <div className="relative">
                                <input
                                    id="apiKey"
                                    type={isVisible ? "text" : "password"}
                                    value={inputKey}
                                    onChange={(e) => setInputKey(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsVisible(!isVisible)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary-foreground hover:text-foreground"
                                >
                                    {isVisible ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            {apiKey && (
                                <Button variant="danger" onClick={handleClear}>
                                    Remove Key
                                </Button>
                            )}
                            <Button variant="primary" onClick={handleSave}>
                                Save Key
                            </Button>
                        </div>

                        <p className="text-xs text-secondary-foreground mt-4">
                            Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get one from Google AI Studio</a> (it's free).
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
