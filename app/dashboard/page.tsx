"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";

export default function Dashboard() {
    const supabase = createClient();
    const router = useRouter();

    const [blocks, setBlocks] = useState<any[]>([]);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [loading, setLoading] = useState(false);

    // Fetch blocks
    const fetchBlocks = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            router.replace("/signin");
            return;
        }

        const { data, error } = await supabase
            .from("study_blocks")
            .select("*")
            .eq("user_id", user.id)
            .order("start_time");

        if (error) console.error(error);
        else setBlocks(data || []);
    };

    useEffect(() => {
        fetchBlocks();
    }, []);

    // Create block
    const createBlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from("study_blocks").insert([
            {
                user_id: user.id,
                start_time: startTime,
                end_time: endTime,
                notified: false,
            },
        ]);

        if (error) {
            console.error(error);
        } else {
            setStartTime("");
            setEndTime("");
            fetchBlocks();
        }
        setLoading(false);
    };

    // Delete block
    const deleteBlock = async (id: string) => {
        const { error } = await supabase
            .from("study_blocks")
            .delete()
            .eq("id", id);
        if (error) console.error(error);
        else fetchBlocks();
    };

    return (
        <div className="min-h-screen w-1/3 mx-auto bg-gray-900 p-8">
            <h1 className="text-2xl font-bold mb-4">📚 Study Blocks</h1>

            {/* Form */}
            <form onSubmit={createBlock} className="space-y-4 mb-8">
                <div>
                    <label className="block text-sm font-medium">
                        Start Time
                    </label>
                    <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="border px-3 py-2 rounded-md w-full text-white"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">
                        End Time
                    </label>
                    <input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="border px-3 py-2 rounded-md w-full text-white"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                    {loading ? "Saving..." : "Add Block"}
                </button>
            </form>

            {/* Blocks List */}
            <ul className="space-y-3">
                {blocks.map((block) => (
                    <li
                        key={block.id}
                        className="bg-gray-800 shadow-md rounded-md p-4 flex justify-between items-center"
                    >
                        <div>
                            <p>
                                <b>Start:</b>{" "}
                                {new Date(block.start_time).toLocaleString(
                                    "en-IN"
                                )}
                            </p>
                            <p>
                                <b>End:</b>{" "}
                                {new Date(block.end_time).toLocaleString(
                                    "en-IN"
                                )}
                            </p>
                        </div>
                        <button
                            onClick={() => deleteBlock(block.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded-md"
                        >
                            Delete
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
