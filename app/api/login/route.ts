import { NextResponse } from "next/server"
import clientPromise from "@/app/lib/mongodb"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const { walletAddress, password } = await request.json()

  if (!walletAddress || !password) {
    return NextResponse.json({ error: "Wallet address and password are required" }, { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db("crypto-casino")
    const user = await db.collection("users").findOne({ walletAddress })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    return NextResponse.json({ username: user.username, email: user.email, walletAddress: user.walletAddress })
  } catch (error) {
    console.error("Error logging in:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

