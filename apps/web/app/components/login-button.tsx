"use client"

import {signIn,signOut,useSession} from "next-auth/react"

export default function LoginButton(){
    const {data: session} = useSession()
    if(session){
        return(
            <div className="flex flex-col items-center gap-4">
                <h1 className="text-black text-2xl">
                    Welcome {session.user?.name}
                </h1>

                <button
                    onClick={() => signOut}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg"
                >
                    Logout
                </button>
            </div>
        )
    }
    return (
        <button
            onClick={() => signIn("github")}
            className = "bg-black text-white px-4 py-2 rounded-lg"
        >
            Login with Github
        </button>
    )
}