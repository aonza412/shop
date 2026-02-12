import { NextResponse } from "next/server";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await deleteDoc(doc(db, "products", id));
        return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, description, imageUrl, category } = body;

        const docRef = doc(db, "products", id);
        await updateDoc(docRef, {
            name,
            description,
            imageUrl,
            category,
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ message: "Product updated successfully" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }
}
