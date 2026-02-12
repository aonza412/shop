import { NextResponse } from "next/server";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
    try {
        const docRef = doc(db, "settings", "general");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return NextResponse.json(docSnap.data());
        } else {
            // Default settings
            return NextResponse.json({
                shopName: "Elegant Collection",
                logoUrl: "",
                bannerUrl: "",
                logoShape: "rectangle",
                logoSize: 80,
                theme: "dark",
                categories: ["General", "Electronics", "Fashion", "Home", "Art"]
            });
        }
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        // Check if categories are provided in the body, if so update them, otherwise update general settings
        const { shopName, logoUrl, bannerUrl, logoShape, logoSize, categories } = body;

        const docRef = doc(db, "settings", "general");

        let updateData: any = {};
        if (categories) updateData.categories = categories;
        if (shopName !== undefined) updateData.shopName = shopName;
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
        if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
        if (logoShape !== undefined) updateData.logoShape = logoShape;
        if (logoSize !== undefined) updateData.logoSize = logoSize;

        await setDoc(docRef, updateData, { merge: true });

        return NextResponse.json({ message: "Settings updated successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
