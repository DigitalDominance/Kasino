import { NextResponse } from "next/server"
import clientPromise from "@/app/lib/mongodb"
import bcrypt from "bcryptjs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get("walletAddress")

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db("crypto-casino")
    const user = await db.collection("users").findOne({ walletAddress })

    if (user) {
      return NextResponse.json({ username: user.username, walletAddress: user.walletAddress })
    } else {
      return NextResponse.json(null)
    }
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { email, username, password, walletAddress } = await request.json()

  if (!email || !username || !password || !walletAddress) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  try {
    const client = await clientPromise
    const db = client.db("crypto-casino")

    // Check for existing user with the same username, email, or wallet address
    const existingUser = await db.collection("users").findOne({
      $or: [{ username }, { email }, { walletAddress }],
    })

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json({ error: "Username already exists" }, { status: 400 })
      }
      if (existingUser.email === email) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 })
      }
      if (existingUser.walletAddress === walletAddress) {
        return NextResponse.json({ error: "Wallet address already associated with an account" }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = {
      username,
      email,
      walletAddress,
      password: hashedPassword,
      createdAt: new Date(),
    }

    await db.collection("users").insertOne(newUser)

    return NextResponse.json({ username, walletAddress })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

