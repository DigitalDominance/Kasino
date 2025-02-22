{/* Live Wins */}
<motion.div
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
>
  <h2 className="text-2xl font-bold mb-6 text-[#49EACB]">Live Wins</h2>
  <ScrollArea>
    <motion.div
      className="flex gap-4 pb-4"
      initial={{ x: -20 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {liveWins.map((win, i) => (
        <MotionCard
          key={i}
          className="flex-shrink-0 w-[280px] border border-[#49EACB]/10 bg-[#49EACB]/5 backdrop-blur-sm overflow-hidden"
          whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(73, 234, 203, 0.15)" }}
        >
          <div className="relative aspect-video">
            <Image
              src={win.image}
              alt={`${win.game} card`}
              layout="fill"
              objectFit="contain"
              className="object-contain"
            />
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-[#49EACB] text-black text-sm font-semibold">
              LIVE
            </div>
          </div>
          <div className="p-4">
            <div className="font-semibold mb-2">{win.player}</div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm text-[#49EACB]">{win.game} Game</div>
              <div className="flex items-center gap-1.5">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Kaspa-Icon-64-2jq8rPBjkF7DpZ7Rw7jXyXdd3dVlow.webp"
                  alt="KAS"
                  width={16}
                  height={16}
                  className="rounded-full"
                />
                <span className="text-[#49EACB] font-bold">{win.amount}</span>
              </div>
            </div>
            <div className="text-sm text-gray-400">{win.time}</div>
          </div>
        </MotionCard>
      ))}
    </motion.div>
    <ScrollBar orientation="horizontal" className="bg-[#49EACB]/10 hover:bg-[#49EACB]/20" />
  </ScrollArea>
</motion.div>
