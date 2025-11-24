import { useState } from "react";
import axios from "axios";

function CheckPhish() {
    const [url, setUrl] = useState("");
    const [result, setResult] = useState(null);

    const handleCheck = async () => {
        const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/check-url`, { url });
        setResult(response.data);
    };

    return (
        <div>
            <input 
                type="text" 
                placeholder="Enter URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
            />
            <button onClick={handleCheck}>Check URL</button>

            {result && (
                <pre>{JSON.stringify(result, null, 2)}</pre>
            )}
        </div>
    );
}

export default CheckPhish;
