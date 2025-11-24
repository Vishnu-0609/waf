import { useState } from 'react';
import { Header } from '../components/Header';
import { InputPanel } from '../components/InputPanel';
import { ResultsPanel } from '../components/ResultPanel';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
const DEFAULT_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const buildAbsoluteUrl = (pathOrUrl, headers) => {
    if (!pathOrUrl) return '';
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        return pathOrUrl;
    }

    const hostHeader = headers?.Host || headers?.host;
    if (!hostHeader) return pathOrUrl;
    const protocol = hostHeader.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${hostHeader}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
};

const parseRawRequest = (rawInput) => {
    const sanitized = rawInput.replace(/\r/g, '').trim();
    if (!sanitized) {
        return {
            method: 'GET',
            url: '',
            headers: {},
            body: ''
        };
    }

    const [headerPart, ...bodyParts] = sanitized.split('\n\n');
    const headerLines = headerPart.split('\n').filter(Boolean);
    const body = bodyParts.join('\n\n');

    let requestLine = headerLines.shift() || '';
    let method = 'GET';
    let url = '';

    const requestLineParts = requestLine.split(' ');
    const methodCandidate = requestLineParts[0]?.toUpperCase();

    if (HTTP_METHODS.includes(methodCandidate)) {
        method = methodCandidate;
        url = requestLineParts[1] || '';
    } else {
        url = requestLine;
    }

    const headers = headerLines.reduce((acc, line) => {
        const divider = line.indexOf(':');
        if (divider === -1) return acc;
        const key = line.slice(0, divider).trim();
        const value = line.slice(divider + 1).trim();
        if (key) acc[key] = value;
        return acc;
    }, {});

    const finalUrl = buildAbsoluteUrl(url, headers);

    return {
        method,
        url: finalUrl || url,
        headers,
        body: body.trim()
    };
};

function RequestAnalyzer() {
    const [input, setInput] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!input.trim()) return;

        const parsedRequest = parseRawRequest(input);
        if (!parsedRequest.url) {
            setError('Unable to detect a target URL. Include a full URL or Host header.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${DEFAULT_BACKEND_URL}/analyze-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsedRequest)
            });

            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                throw new Error(errorPayload.detail || 'Analysis failed');
            }

            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Analysis error:', error);
            setError(error.message || 'Unexpected error while analyzing request');
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-linear-to-br from-gray-50 to-gray-100 overflow-hidden">
            {/* <Header /> */}

            <main className="flex-1 overflow-auto">
                <div className="container mx-auto px-6 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                        <InputPanel
                            input={input}
                            onInputChange={setInput}
                            onAnalyze={handleAnalyze}
                            loading={loading}
                        />
                        <ResultsPanel result={result} />
                    </div>
                    {error && (
                        <div className="max-w-7xl mx-auto mt-6">
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="text-center py-2 text-gray-600 text-sm shrink-0">
                <p>Advanced security analysis using pattern-based machine learning detection</p>
            </footer>
        </div>
    )
}

export default RequestAnalyzer