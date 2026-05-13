type PlannerOperation = {
  type: string;
  description: string;
  parent_path: string;
  name: string;
  class_name: string;
  script_type: string;
  source: string;
  path: string;
};

function ensureInstance(parentPath: string, name: string, className: string, description: string): PlannerOperation {
  return {
    type: "ensure_instance",
    description,
    parent_path: parentPath,
    name,
    class_name: className,
    script_type: "",
    source: "",
    path: "",
  };
}

function upsertScript(
  parentPath: string,
  name: string,
  scriptType: string,
  description: string,
  source: string,
): PlannerOperation {
  return {
    type: "upsert_script",
    description,
    parent_path: parentPath,
    name,
    class_name: "",
    script_type: scriptType,
    source,
    path: "",
  };
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function detectTheme(prompt: string) {
  const normalized = prompt.toLowerCase();

  if (/(shop|store|bundle|purchase|currency|cash)/.test(normalized)) {
    return "shop";
  }

  if (/(inventory|item|equip|hotbar|backpack)/.test(normalized)) {
    return "inventory";
  }

  if (/(round|lobby|intermission|wave|survival|match)/.test(normalized)) {
    return "rounds";
  }

  if (/(combat|attack|damage|hitbox|sword|ability)/.test(normalized)) {
    return "combat";
  }

  if (/(quest|mission|objective|daily)/.test(normalized)) {
    return "quest";
  }

  if (/(rng|roll|rarity|gacha|spin)/.test(normalized)) {
    return "rng";
  }

  return "starter";
}

function buildInventoryPlan(prompt: string) {
  return {
    title: "Inventory UI Starter",
    summary: "Creates a basic inventory shell with client state, sample items, and a server inventory seed.",
    explanation:
      "The built-in planner generated a lightweight inventory baseline so you can pair Studio, test the flow, and then refine the visuals or logic with stronger models later.",
    manual_steps: [
      "Open StarterGui after sync and style the frames to match your game's exact art direction.",
      "Replace the sample item data in InventoryConfig with your real item set.",
    ],
    operations: [
      ensureInstance("ReplicatedStorage", "InventorySystem", "Folder", "Create a shared inventory folder."),
      ensureInstance("StarterGui", "InventoryGui", "ScreenGui", "Create the inventory screen GUI root."),
      upsertScript(
        "ReplicatedStorage/InventorySystem",
        "InventoryConfig",
        "ModuleScript",
        "Store starter inventory item data.",
        `-- InventoryConfig
return {
	items = {
		{ id = "wood_sword", name = "Wood Sword", rarity = "Common" },
		{ id = "slime_core", name = "Slime Core", rarity = "Rare" },
		{ id = "ancient_key", name = "Ancient Key", rarity = "Epic" },
	}
}
`,
      ),
      upsertScript(
        "ServerScriptService",
        "InventoryServer",
        "Script",
        "Seed a small inventory dataset on the server.",
        `-- InventoryServer
local Players = game:GetService("Players")

local starterItems = {
	{ id = "wood_sword", equipped = true },
	{ id = "slime_core", equipped = false },
	{ id = "ancient_key", equipped = false },
}

Players.PlayerAdded:Connect(function(player)
	local inventoryFolder = Instance.new("Folder")
	inventoryFolder.Name = "InventoryState"
	inventoryFolder.Parent = player

	for _, item in ipairs(starterItems) do
		local value = Instance.new("StringValue")
		value.Name = item.id
		value.Value = item.equipped and "equipped" or "stored"
		value.Parent = inventoryFolder
	end
end)
`,
      ),
      upsertScript(
        "StarterPlayer/StarterPlayerScripts",
        "InventoryClient",
        "LocalScript",
        "Create a simple toggleable inventory shell and sample slots.",
        `-- InventoryClient
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local gui = playerGui:WaitForChild("InventoryGui")

gui.ResetOnSpawn = false

local frame = Instance.new("Frame")
frame.Name = "Window"
frame.Size = UDim2.fromOffset(460, 300)
frame.Position = UDim2.fromScale(0.5, 0.5)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
frame.BackgroundColor3 = Color3.fromRGB(23, 28, 38)
frame.Visible = false
frame.Parent = gui

local list = Instance.new("UIGridLayout")
list.CellSize = UDim2.fromOffset(96, 96)
list.CellPadding = UDim2.fromOffset(10, 10)
list.Parent = frame

for _, name in ipairs({ "Wood Sword", "Slime Core", "Ancient Key" }) do
	local slot = Instance.new("TextButton")
	slot.Text = name
	slot.TextWrapped = true
	slot.TextColor3 = Color3.fromRGB(245, 247, 250)
	slot.BackgroundColor3 = Color3.fromRGB(43, 56, 77)
	slot.Parent = frame
end

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end

	if input.KeyCode == Enum.KeyCode.B then
		frame.Visible = not frame.Visible
	end
end)
`,
      ),
    ],
  };
}

function buildShopPlan(prompt: string) {
  return {
    title: "Shop System Starter",
    summary: "Creates a starter shop shell with item definitions, balance state, and a simple client storefront.",
    explanation:
      "This gives you a real store foundation fast: config, server state, and a basic UI loop. It is intentionally lightweight so you can iterate quickly in Studio.",
    manual_steps: [
      "Replace the sample prices and products with your real economy.",
      "If you want developer products, add your Roblox product IDs into ShopConfig later.",
    ],
    operations: [
      ensureInstance("ReplicatedStorage", "ShopSystem", "Folder", "Create the shop system folder."),
      ensureInstance("StarterGui", "ShopGui", "ScreenGui", "Create the shop screen GUI root."),
      upsertScript(
        "ReplicatedStorage/ShopSystem",
        "ShopConfig",
        "ModuleScript",
        "Define starter shop items and prices.",
        `-- ShopConfig
return {
	items = {
		{ id = "coin_pack_small", name = "Small Coin Pack", price = 100 },
		{ id = "speed_boost", name = "Speed Boost", price = 250 },
		{ id = "vip_crate", name = "VIP Crate", price = 500 },
	}
}
`,
      ),
      upsertScript(
        "ServerScriptService",
        "ShopServer",
        "Script",
        "Create a sample balance state for each player.",
        `-- ShopServer
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player

	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Value = 500
	coins.Parent = leaderstats
end)
`,
      ),
      upsertScript(
        "StarterPlayer/StarterPlayerScripts",
        "ShopClient",
        "LocalScript",
        "Create a simple store panel that reads the player's balance.",
        `-- ShopClient
local Players = game:GetService("Players")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local gui = playerGui:WaitForChild("ShopGui")

gui.ResetOnSpawn = false

local frame = Instance.new("Frame")
frame.Name = "Window"
frame.Size = UDim2.fromOffset(520, 320)
frame.Position = UDim2.fromScale(0.5, 0.5)
frame.AnchorPoint = Vector2.new(0.5, 0.5)
frame.BackgroundColor3 = Color3.fromRGB(20, 32, 48)
frame.Parent = gui

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -24, 0, 42)
title.Position = UDim2.fromOffset(12, 12)
title.BackgroundTransparency = 1
title.TextColor3 = Color3.fromRGB(245, 247, 250)
title.Text = "Starter Shop"
title.Parent = frame

local balance = Instance.new("TextLabel")
balance.Size = UDim2.new(1, -24, 0, 28)
balance.Position = UDim2.fromOffset(12, 58)
balance.BackgroundTransparency = 1
balance.TextColor3 = Color3.fromRGB(200, 255, 120)
balance.Parent = frame

local function refresh()
	local leaderstats = player:FindFirstChild("leaderstats")
	local coins = leaderstats and leaderstats:FindFirstChild("Coins")
	balance.Text = "Coins: " .. tostring(coins and coins.Value or 0)
end

refresh()
player.ChildAdded:Connect(refresh)
`,
      ),
    ],
  };
}

function buildRoundsPlan(prompt: string) {
  return {
    title: "Round Loop Starter",
    summary: "Creates a simple round controller with lobby and live phases plus a lightweight client status label.",
    explanation:
      "This is a minimal round-state machine so you can prove the site-to-Studio loop and then keep layering more match logic onto a stable baseline.",
    manual_steps: [
      "Replace the placeholder map teleport logic with your actual spawn locations.",
      "Connect rewards or elimination conditions to the round loop once the baseline is running.",
    ],
    operations: [
      upsertScript(
        "ServerScriptService",
        "RoundDirector",
        "Script",
        "Run a simple lobby and round timer loop.",
        `-- RoundDirector
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local statusValue = Instance.new("StringValue")
statusValue.Name = "RoundStatus"
statusValue.Value = "Waiting for players"
statusValue.Parent = ReplicatedStorage

while true do
	statusValue.Value = "Lobby - match starts soon"
	task.wait(10)

	statusValue.Value = "Round live"
	task.wait(45)

	statusValue.Value = "Intermission"
	task.wait(12)
end
`,
      ),
      upsertScript(
        "StarterPlayer/StarterPlayerScripts",
        "RoundHudClient",
        "LocalScript",
        "Show the replicated round status on screen.",
        `-- RoundHudClient
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.Name = "RoundHud"
gui.ResetOnSpawn = false
gui.Parent = playerGui

local label = Instance.new("TextLabel")
label.Size = UDim2.fromOffset(320, 42)
label.Position = UDim2.fromScale(0.5, 0.08)
label.AnchorPoint = Vector2.new(0.5, 0)
label.BackgroundColor3 = Color3.fromRGB(17, 23, 36)
label.TextColor3 = Color3.fromRGB(245, 247, 250)
label.Parent = gui

local statusValue = ReplicatedStorage:WaitForChild("RoundStatus")
label.Text = statusValue.Value
statusValue:GetPropertyChangedSignal("Value"):Connect(function()
	label.Text = statusValue.Value
end)
`,
      ),
    ],
  };
}

function buildCombatPlan(prompt: string) {
  return {
    title: "Combat Starter",
    summary: "Creates a small combat config plus a server/client baseline for basic attacks and cooldown timing.",
    explanation:
      "The built-in starter keeps combat intentionally simple: one attack event loop, one cooldown, and enough structure to iterate without extra setup.",
    manual_steps: [
      "Replace the placeholder distance check with a real hitbox or raycast system later.",
      "Connect animation IDs and VFX once the base loop feels right.",
    ],
    operations: [
      ensureInstance("ReplicatedStorage", "CombatSystem", "Folder", "Create the combat system folder."),
      upsertScript(
        "ReplicatedStorage/CombatSystem",
        "CombatConfig",
        "ModuleScript",
        "Store basic combat tuning values.",
        `-- CombatConfig
return {
	damage = 12,
	cooldown = 0.8,
	range = 8,
}
`,
      ),
      upsertScript(
        "ServerScriptService",
        "CombatServer",
        "Script",
        "Create a starter server combat loop.",
        `-- CombatServer
local Players = game:GetService("Players")

local lastAttackByUserId = {}

local function canAttack(player)
	local lastAttack = lastAttackByUserId[player.UserId] or 0
	if os.clock() - lastAttack < 0.8 then
		return false
	end

	lastAttackByUserId[player.UserId] = os.clock()
	return true
end

Players.PlayerAdded:Connect(function(player)
	player.Chatted:Connect(function(message)
		if message:lower() == "/attack" and canAttack(player) then
			print(player.Name .. " used the starter attack.")
		end
	end)
end)
`,
      ),
      upsertScript(
        "StarterPlayer/StarterPlayerScripts",
        "CombatClient",
        "LocalScript",
        "Bind a starter attack action to F.",
        `-- CombatClient
local ContextActionService = game:GetService("ContextActionService")
local Players = game:GetService("Players")

local player = Players.LocalPlayer

local function onAttack(_, state)
	if state ~= Enum.UserInputState.Begin then
		return
	end

	game:GetService("StarterGui"):SetCore("ChatMakeSystemMessage", {
		Text = "Starter attack triggered. Hook this into remotes next."
	})
end

ContextActionService:BindAction("StarterAttack", onAttack, false, Enum.KeyCode.F)
`,
      ),
    ],
  };
}

function buildQuestPlan(prompt: string) {
  return {
    title: "Quest Starter",
    summary: "Creates a small quest definition module with a client quest list scaffold.",
    explanation:
      "This is a safe starter for daily or repeatable quests: a data module, a server source of truth, and a lightweight UI list.",
    manual_steps: [
      "Replace the sample quest list with your real objectives and reward values.",
      "Hook quest completion to real gameplay events later.",
    ],
    operations: [
      ensureInstance("ReplicatedStorage", "QuestSystem", "Folder", "Create the quest system folder."),
      upsertScript(
        "ReplicatedStorage/QuestSystem",
        "QuestDefinitions",
        "ModuleScript",
        "Store a starter quest list.",
        `-- QuestDefinitions
return {
	{ id = "play_round", name = "Play 1 round", reward = 100 },
	{ id = "collect_coin", name = "Collect 50 coins", reward = 150 },
	{ id = "open_inventory", name = "Open your inventory", reward = 50 },
}
`,
      ),
      upsertScript(
        "StarterPlayer/StarterPlayerScripts",
        "QuestClient",
        "LocalScript",
        "Draw a simple quest tracker panel.",
        `-- QuestClient
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.Name = "QuestTracker"
gui.ResetOnSpawn = false
gui.Parent = playerGui

local frame = Instance.new("Frame")
frame.Size = UDim2.fromOffset(280, 220)
frame.Position = UDim2.fromScale(0.82, 0.2)
frame.BackgroundColor3 = Color3.fromRGB(20, 27, 38)
frame.Parent = gui

local list = Instance.new("UIListLayout")
list.Padding = UDim.new(0, 8)
list.Parent = frame

local quests = require(ReplicatedStorage:WaitForChild("QuestSystem"):WaitForChild("QuestDefinitions"))
for _, quest in ipairs(quests) do
	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(1, -16, 0, 42)
	label.BackgroundTransparency = 1
	label.TextColor3 = Color3.fromRGB(245, 247, 250)
	label.TextWrapped = true
	label.Text = quest.name .. "  •  Reward " .. quest.reward
	label.Parent = frame
end
`,
      ),
    ],
  };
}

function buildRngPlan(prompt: string) {
  return {
    title: "RNG Roll Starter",
    summary: "Creates a small RNG config and a client roll button scaffold with weighted sample outcomes.",
    explanation:
      "The built-in starter gives you a real roll loop with readable weights so you can prove the interaction and tune the rarity curve later.",
    manual_steps: [
      "Adjust the weights in RollConfig to match your intended rarity curve.",
      "Replace the sample output message with your reveal animation or card UI.",
    ],
    operations: [
      ensureInstance("ReplicatedStorage", "RngSystem", "Folder", "Create the RNG system folder."),
      upsertScript(
        "ReplicatedStorage/RngSystem",
        "RollConfig",
        "ModuleScript",
        "Store sample weighted outcomes.",
        `-- RollConfig
return {
	{ name = "Common", weight = 70 },
	{ name = "Rare", weight = 22 },
	{ name = "Epic", weight = 7 },
	{ name = "Legendary", weight = 1 },
}
`,
      ),
      upsertScript(
        "StarterPlayer/StarterPlayerScripts",
        "RollClient",
        "LocalScript",
        "Create a local RNG button for starter testing.",
        `-- RollClient
local Players = game:GetService("Players")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.Name = "RollGui"
gui.ResetOnSpawn = false
gui.Parent = playerGui

local button = Instance.new("TextButton")
button.Size = UDim2.fromOffset(220, 64)
button.Position = UDim2.fromScale(0.5, 0.82)
button.AnchorPoint = Vector2.new(0.5, 0.5)
button.BackgroundColor3 = Color3.fromRGB(68, 94, 155)
button.TextColor3 = Color3.fromRGB(255, 255, 255)
button.Text = "Roll Starter RNG"
button.Parent = gui

button.MouseButton1Click:Connect(function()
	local random = Random.new():NextNumber(0, 100)
	local outcome = if random <= 1 then "Legendary" elseif random <= 8 then "Epic" elseif random <= 30 then "Rare" else "Common"
	button.Text = "Rolled: " .. outcome
end)
`,
      ),
    ],
  };
}

function buildStarterFallbackPlan(prompt: string) {
  const trimmed = prompt.trim() || "new mechanic";
  const concise = titleCase(trimmed.split(/[.!?]/)[0].slice(0, 48));

  return {
    title: concise ? `${concise} Starter` : "Mechanic Starter",
    summary: "Creates a small server/client/module scaffold so you can keep the site-to-Studio loop moving without any external AI provider.",
    explanation:
      "This fallback planner is intentionally conservative. It gives you a sane Roblox structure for the idea, then you can keep iterating with either the built-in starter or a stronger external model later.",
    manual_steps: [
      "Replace placeholder comments with your exact gameplay rules once the scaffold is in Studio.",
      "Load more packs or switch to a deeper model later if you want a more opinionated system.",
    ],
    operations: [
      ensureInstance("ReplicatedStorage", "ZestSystems", "Folder", "Create a shared starter folder."),
      upsertScript(
        "ReplicatedStorage/ZestSystems",
        "MechanicConfig",
        "ModuleScript",
        "Create a config module for the new mechanic.",
        `-- MechanicConfig
return {
	name = ${JSON.stringify(trimmed)},
	debug = true,
}
`,
      ),
      upsertScript(
        "ServerScriptService",
        "MechanicServer",
        "Script",
        "Create a small server scaffold for the requested feature.",
        `-- MechanicServer
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local config = require(ReplicatedStorage:WaitForChild("ZestSystems"):WaitForChild("MechanicConfig"))

print("Starter scaffold ready for", config.name)

-- Add your main server authority logic here.
`,
      ),
      upsertScript(
        "StarterPlayer/StarterPlayerScripts",
        "MechanicClient",
        "LocalScript",
        "Create a client scaffold for the requested feature.",
        `-- MechanicClient
print("Client scaffold ready for the new mechanic.")

-- Add your UI, input, and feel layer here.
`,
      ),
    ],
  };
}

export function buildStarterPlan(messages: { role: string; content: string }[]) {
  const lastUserMessage =
    [...messages].reverse().find((message) => message.role === "user" && message.content.trim())?.content || "";

  const theme = detectTheme(lastUserMessage);

  switch (theme) {
    case "inventory":
      return buildInventoryPlan(lastUserMessage);
    case "shop":
      return buildShopPlan(lastUserMessage);
    case "rounds":
      return buildRoundsPlan(lastUserMessage);
    case "combat":
      return buildCombatPlan(lastUserMessage);
    case "quest":
      return buildQuestPlan(lastUserMessage);
    case "rng":
      return buildRngPlan(lastUserMessage);
    default:
      return buildStarterFallbackPlan(lastUserMessage);
  }
}
