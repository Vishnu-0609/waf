import React, { useState, useEffect } from 'react';
import ReconnectingWebSocket from "reconnecting-websocket";

import { ProxyControls } from '../components/ProxyControls';
import { RequestTable } from '../components/RequestTable';
import { RequestInspector } from '../components/RequestInspector';

function Intercepter() {
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isProxyActive, setIsProxyActive] = useState(false);

    const loadRequests = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/pendingRequests`);
            const data = await res.json();
            setRequests(data);
        } catch (error) {
            console.error('Error loading requests:', error);
        }
    };

    useEffect(() => {
        const fetchInitial = async () => {
            await loadRequests();
        };
        fetchInitial();

        // 🔥 Reconnecting WebSocket
        const ws = new ReconnectingWebSocket(`ws://localhost:8000/ws`, [], {
            maxRetries: 10,
            reconnectInterval: 2000
        });

        ws.onopen = () => {
            console.log("WebSocket connected");
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                // Backend sends: { event: "new_request", data: {...} }
                if (message.event === "new_request") {
                    console.log("📩 New request received:", message.data);

                    // Reload or prepend new request
                    setRequests((prev) => [message.data, ...prev]);
                }
            } catch (err) {
                console.error("WebSocket parse error:", err);
            }
        };

        ws.onclose = () => console.log("WebSocket disconnected");
        ws.onerror = (err) => console.error("WebSocket error:", err);

        return () => ws.close();
    }, []);

    const handleToggleProxy = async () => {
        try {
            if (isProxyActive) {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/stopproxy`, { method: "POST" });
                const data = await res.json();
                if (data.stopped) setIsProxyActive(false);
            } else {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/startproxy`, { method: "POST" });
                const data = await res.json();
                if (data.running) setIsProxyActive(true);
            }
        } catch (error) {
            console.error("Error toggling proxy:", error);
        }
    };

    const handleSelectRequest = (req) => setSelectedRequest(req);
    const handleCloseInspector = () => setSelectedRequest(null);

    return (
        <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
            <ProxyControls
                isProxyActive={isProxyActive}
                onToggleProxy={handleToggleProxy}
                requestCount={requests.length}
            />

            {/* Main Content Split */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: Request Table (scrollable) */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto">
                    <RequestTable
                        requests={requests}
                        selectedRequest={selectedRequest}
                        onSelectRequest={handleSelectRequest}
                    />
                </div>

                <RequestInspector
                    request={selectedRequest}
                    onClose={handleCloseInspector}
                />
            </div>
        </div>

    );
}

export default Intercepter;
