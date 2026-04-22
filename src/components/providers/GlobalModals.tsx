'use client'

import { Snow } from '@/components/ui/Snow'
import { useUIStore } from '@/store/uiStore'

export function GlobalModals() {
    const { snowEnabled } = useUIStore()

    return (
        <>
            <Snow enabled={snowEnabled} />
            {/* Add other global modals here */}
        </>
    )
}
