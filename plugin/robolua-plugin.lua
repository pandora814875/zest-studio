local HttpService = game:GetService("HttpService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local ScriptEditorService = game:GetService("ScriptEditorService")
local StudioService = game:GetService("StudioService")
local Players = game:GetService("Players")

local DEFAULT_SUPABASE_URL = "https://atycbrnthkgbrsxyabbs.supabase.co"
local DEFAULT_SUPABASE_API_KEY = "sb_publishable_7pxGbv-NvSefp8w9RpZ8_g_vkQNkSOJ"
local DEFAULT_POLL_SECONDS = 4
local PLUGIN_NAME = "Zest Plugin"

local SETTINGS_KEYS = {
	url = "zest_url",
	apiKey = "zest_api_key",
	workspaceToken = "zest_workspace_token",
	pollSeconds = "zest_poll_seconds",
}

local LEGACY_SETTINGS_KEYS = {
	url = "robolua_url",
	apiKey = "robolua_api_key",
	workspaceToken = "robolua_workspace_token",
	pollSeconds = "robolua_poll_seconds",
}

local TOOLBAR = plugin:CreateToolbar("Zest Studio")
local TOGGLE_BUTTON = TOOLBAR:CreateButton(
	"Zest",
	"Open the Zest Studio bridge",
	"rbxassetid://4458901886"
)

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	true,
	false,
	360,
	620,
	320,
	520
)

local widget = plugin:CreateDockWidgetPluginGui("ZestStudioWidget", widgetInfo)
widget.Title = "Zest Studio"

local state = {
	isRunning = false,
}

local function getSettingWithFallback(primaryKey, legacyKey, fallbackValue)
	local primaryValue = plugin:GetSetting(primaryKey)
	if primaryValue ~= nil and primaryValue ~= "" then
		return primaryValue
	end

	local legacyValue = plugin:GetSetting(legacyKey)
	if legacyValue ~= nil and legacyValue ~= "" then
		return legacyValue
	end

	return fallbackValue
end

local config = {
	url = getSettingWithFallback(SETTINGS_KEYS.url, LEGACY_SETTINGS_KEYS.url, DEFAULT_SUPABASE_URL),
	apiKey = getSettingWithFallback(SETTINGS_KEYS.apiKey, LEGACY_SETTINGS_KEYS.apiKey, DEFAULT_SUPABASE_API_KEY),
	workspaceToken = getSettingWithFallback(SETTINGS_KEYS.workspaceToken, LEGACY_SETTINGS_KEYS.workspaceToken, ""),
	pollSeconds = tonumber(getSettingWithFallback(SETTINGS_KEYS.pollSeconds, LEGACY_SETTINGS_KEYS.pollSeconds, DEFAULT_POLL_SECONDS)) or DEFAULT_POLL_SECONDS,
}

local function trim(value)
	return (value or ""):match("^%s*(.-)%s*$")
end

local root = Instance.new("Frame")
root.Name = "Root"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundTransparency = 1
root.Parent = widget

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 10)
layout.Parent = root

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 14)
padding.PaddingLeft = UDim.new(0, 14)
padding.PaddingRight = UDim.new(0, 14)
padding.PaddingBottom = UDim.new(0, 14)
padding.Parent = root

local function makeLabel(text, size, color)
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Top
	label.Font = Enum.Font.Gotham
	label.TextWrapped = true
	label.TextSize = size or 13
	label.TextColor3 = color or Color3.fromRGB(235, 238, 231)
	label.AutomaticSize = Enum.AutomaticSize.Y
	label.Size = UDim2.new(1, 0, 0, 0)
	label.Text = text
	return label
end

local function makeBox(placeholder, initialValue, height)
	local box = Instance.new("TextBox")
	box.Size = UDim2.new(1, 0, 0, height or 38)
	box.BackgroundColor3 = Color3.fromRGB(21, 24, 23)
	box.BorderSizePixel = 0
	box.TextColor3 = Color3.fromRGB(239, 241, 236)
	box.PlaceholderColor3 = Color3.fromRGB(126, 132, 123)
	box.PlaceholderText = placeholder
	box.Text = initialValue or ""
	box.Font = Enum.Font.Code
	box.TextSize = 14
	box.TextXAlignment = Enum.TextXAlignment.Left
	box.ClearTextOnFocus = false
	box.TextWrapped = false
	return box
end

local function makeButton(text, backgroundColor)
	local button = Instance.new("TextButton")
	button.Size = UDim2.new(1, 0, 0, 40)
	button.BackgroundColor3 = backgroundColor
	button.BorderSizePixel = 0
	button.TextColor3 = Color3.fromRGB(12, 15, 11)
	button.Font = Enum.Font.GothamBold
	button.TextSize = 14
	button.Text = text
	button.AutoButtonColor = true
	return button
end

local title = makeLabel("Zest Studio", 20, Color3.fromRGB(208, 245, 102))
title.Font = Enum.Font.GothamBlack
title.Parent = root

local subtitle = makeLabel(
	"Install the plugin once, enter the short pairing code from the Zest dashboard, then let Studio claim jobs and apply scripts automatically.",
	13,
	Color3.fromRGB(184, 191, 179)
)
subtitle.Parent = root

local pairLabel = makeLabel("1. Pair with dashboard code", 12, Color3.fromRGB(184, 191, 179))
pairLabel.Parent = root
local pairCodeBox = makeBox("Example: 1A2B-3C4D-5E6F-7A8B", "", 38)
pairCodeBox.Parent = root

local pairButton = makeButton("Authorize and connect", Color3.fromRGB(120, 210, 255))
pairButton.Parent = root

local studioAccountLabel = makeLabel("Studio account: checking...", 12, Color3.fromRGB(184, 191, 179))
studioAccountLabel.Parent = root

local urlLabel = makeLabel("Advanced: Supabase URL", 12, Color3.fromRGB(184, 191, 179))
urlLabel.Parent = root
local urlBox = makeBox("https://your-project.supabase.co", config.url)
urlBox.Parent = root

local keyLabel = makeLabel("Advanced: Supabase anon / publishable key", 12, Color3.fromRGB(184, 191, 179))
keyLabel.Parent = root
local keyBox = makeBox("Paste the public key used by the app", config.apiKey, 88)
keyBox.TextWrapped = true
keyBox.TextYAlignment = Enum.TextYAlignment.Top
keyBox.Parent = root

local tokenLabel = makeLabel("Resolved workspace token", 12, Color3.fromRGB(184, 191, 179))
tokenLabel.Parent = root
local tokenBox = makeBox("Shared token from the app", config.workspaceToken)
tokenBox.Parent = root

local pollLabel = makeLabel("2. Polling interval in seconds", 12, Color3.fromRGB(184, 191, 179))
pollLabel.Parent = root
local pollBox = makeBox("5", tostring(config.pollSeconds))
pollBox.Parent = root

local saveButton = makeButton("Save advanced settings", Color3.fromRGB(207, 244, 100))
saveButton.Parent = root

local syncButton = makeButton("3. Start sync", Color3.fromRGB(132, 240, 197))
syncButton.Parent = root

local runOnceButton = makeButton("Check once now", Color3.fromRGB(255, 207, 117))
runOnceButton.Parent = root

local statusLabel = makeLabel("Status: idle", 13, Color3.fromRGB(239, 241, 236))
statusLabel.Parent = root

local logLabel = makeLabel(
	"Tip: keep Allow HTTP Requests enabled in Game Settings > Security. Download the plugin from the Zest site, move it into the Roblox Plugins folder, then restart Studio.",
	12,
	Color3.fromRGB(184, 191, 179)
)
logLabel.Parent = root

local function setStatus(text)
	statusLabel.Text = "Status: " .. text
end

local function setLog(text)
	logLabel.Text = text
end

local function saveConfig()
	config.url = trim(urlBox.Text)
	config.apiKey = trim(keyBox.Text)
	config.workspaceToken = trim(tokenBox.Text)
	config.pollSeconds = math.max(tonumber(trim(pollBox.Text)) or DEFAULT_POLL_SECONDS, 2)

	plugin:SetSetting(SETTINGS_KEYS.url, config.url)
	plugin:SetSetting(SETTINGS_KEYS.apiKey, config.apiKey)
	plugin:SetSetting(SETTINGS_KEYS.workspaceToken, config.workspaceToken)
	plugin:SetSetting(SETTINGS_KEYS.pollSeconds, config.pollSeconds)
	plugin:SetSetting(LEGACY_SETTINGS_KEYS.url, config.url)
	plugin:SetSetting(LEGACY_SETTINGS_KEYS.apiKey, config.apiKey)
	plugin:SetSetting(LEGACY_SETTINGS_KEYS.workspaceToken, config.workspaceToken)
	plugin:SetSetting(LEGACY_SETTINGS_KEYS.pollSeconds, config.pollSeconds)

	setStatus("settings saved")
	setLog("Advanced plugin settings were saved.")
end

local function sanitizePairCode(value)
	return string.upper((value or ""):gsub("[^%w]", ""))
end

local function getStudioIdentity()
	local userId = StudioService:GetUserId()
	if not userId or userId <= 0 then
		error("Sign in to Roblox Studio first so Zest can authorize your Roblox account.")
	end

	local ok, username = pcall(function()
		return Players:GetNameFromUserIdAsync(userId)
	end)

	if not ok or not username or username == "" then
		error("Zest could not resolve the Roblox username for the Studio account.")
	end

	return {
		userId = userId,
		username = username,
		displayName = username,
	}
end

local function refreshStudioAccountLabel()
	local ok, identity = pcall(getStudioIdentity)
	if ok and identity then
		studioAccountLabel.Text = ("Studio account: @%s (ID %d)"):format(identity.username, identity.userId)
	else
		studioAccountLabel.Text = "Studio account: sign in to Roblox Studio first."
	end
end

local function ensureHttpConfigured()
	if config.url == "" or config.apiKey == "" then
		error("Supabase URL and public key are required.")
	end
end

local function ensureConfigured()
	ensureHttpConfigured()
	if config.workspaceToken == "" then
		error("Pair the plugin first or paste a workspace token manually.")
	end
end

local function functionUrl(name)
	return string.gsub(config.url, "/+$", "") .. "/functions/v1/" .. name
end

local function requestJson(functionName, payload, requireWorkspaceToken)
	if requireWorkspaceToken == false then
		ensureHttpConfigured()
	else
		ensureConfigured()
	end

	local response = HttpService:RequestAsync({
		Url = functionUrl(functionName),
		Method = "POST",
		Headers = {
			["Content-Type"] = "application/json",
			["apikey"] = config.apiKey,
		},
		Body = HttpService:JSONEncode(payload),
	})

	if not response.Success then
		error(response.StatusMessage or "HTTP request failed.")
	end

	local decoded = HttpService:JSONDecode(response.Body)
	if response.StatusCode >= 400 then
		error(decoded.error or response.Body)
	end

	return decoded
end

local function pairWithDashboardCode()
	saveConfig()
	local studioIdentity = getStudioIdentity()

	local pairCode = sanitizePairCode(pairCodeBox.Text)
	if pairCode == "" then
		error("Enter the pairing code shown in the Zest dashboard first.")
	end

	setStatus("pairing plugin")
	setLog("Connecting this Studio plugin to your Zest workspace...")

	local response = requestJson("plugin-sync", {
		action = "pair",
		pairCode = pairCode,
		pluginName = PLUGIN_NAME,
		studioUser = studioIdentity,
	}, false)

	config.workspaceToken = trim(response.workspaceToken or "")
	config.pollSeconds = math.max(tonumber(response.pollSeconds) or config.pollSeconds, 2)
	tokenBox.Text = config.workspaceToken
	pollBox.Text = tostring(config.pollSeconds)

	plugin:SetSetting(SETTINGS_KEYS.url, config.url)
	plugin:SetSetting(SETTINGS_KEYS.apiKey, config.apiKey)
	plugin:SetSetting(SETTINGS_KEYS.workspaceToken, config.workspaceToken)
	plugin:SetSetting(SETTINGS_KEYS.pollSeconds, config.pollSeconds)
	plugin:SetSetting(LEGACY_SETTINGS_KEYS.url, config.url)
	plugin:SetSetting(LEGACY_SETTINGS_KEYS.apiKey, config.apiKey)
	plugin:SetSetting(LEGACY_SETTINGS_KEYS.workspaceToken, config.workspaceToken)
	plugin:SetSetting(LEGACY_SETTINGS_KEYS.pollSeconds, config.pollSeconds)

	setStatus("paired")
	setLog(("Authorized as @%s and connected to %s. You can start sync now."):format(studioIdentity.username, response.workspaceName or "your workspace"))
	refreshStudioAccountLabel()
end

local function splitPath(path)
	local parts = {}
	for segment in string.gmatch(path or "", "[^/]+") do
		table.insert(parts, segment)
	end
	return parts
end

local function getRootFromSegment(segment)
	if segment == "game" then
		return game
	end

	local ok, service = pcall(function()
		return game:GetService(segment)
	end)

	if ok and service then
		return service
	end

	return game:FindFirstChild(segment)
end

local function resolvePath(path)
	local parts = splitPath(path)
	if #parts == 0 then
		return nil
	end

	local current = getRootFromSegment(parts[1])
	if not current then
		return nil
	end

	for index = 2, #parts do
		current = current:FindFirstChild(parts[index])
		if not current then
			return nil
		end
	end

	return current
end

local function ensureContainerPath(path)
	local parts = splitPath(path)
	if #parts == 0 then
		error("parent_path is required for this operation.")
	end

	local current = getRootFromSegment(parts[1])
	if not current then
		error("Could not resolve Roblox root service: " .. parts[1])
	end

	for index = 2, #parts do
		local nextChild = current:FindFirstChild(parts[index])
		if not nextChild then
			nextChild = Instance.new("Folder")
			nextChild.Name = parts[index]
			nextChild.Parent = current
		end
		current = nextChild
	end

	return current
end

local function writeScriptSource(scriptInstance, source)
	local updated = false

	local success = pcall(function()
		ScriptEditorService:UpdateSourceAsync(scriptInstance, function()
			return source
		end)
		updated = true
	end)

	if not success or not updated then
		scriptInstance.Source = source
	end
end

local function applyEnsureInstance(operation, resultLog)
	local parent = ensureContainerPath(operation.parent_path)
	local existing = parent:FindFirstChild(operation.name)

	if existing then
		if existing.ClassName ~= operation.class_name then
			error(
				("Existing instance %s has class %s, expected %s."):format(
					existing:GetFullName(),
					existing.ClassName,
					operation.class_name
				)
			)
		end

		table.insert(resultLog, {
			type = operation.type,
			target = existing:GetFullName(),
			result = "already-present",
		})
		return
	end

	local created = Instance.new(operation.class_name)
	created.Name = operation.name
	created.Parent = parent

	table.insert(resultLog, {
		type = operation.type,
		target = created:GetFullName(),
		result = "created",
	})
end

local function applyUpsertScript(operation, resultLog)
	local parent = ensureContainerPath(operation.parent_path)
	local existing = parent:FindFirstChild(operation.name)

	if existing and existing.ClassName ~= operation.script_type then
		error(
			("Existing instance %s has class %s, expected %s."):format(
				existing:GetFullName(),
				existing.ClassName,
				operation.script_type
			)
		)
	end

	local scriptInstance = existing
	if not scriptInstance then
		scriptInstance = Instance.new(operation.script_type)
		scriptInstance.Name = operation.name
		scriptInstance.Parent = parent
	end

	writeScriptSource(scriptInstance, operation.source)

	table.insert(resultLog, {
		type = operation.type,
		target = scriptInstance:GetFullName(),
		result = existing and "updated" or "created",
	})
end

local function applyDeleteInstance(operation, resultLog)
	local target = resolvePath(operation.path)
	if not target then
		table.insert(resultLog, {
			type = operation.type,
			target = operation.path,
			result = "missing-skip",
		})
		return
	end

	if target == game or target.Parent == nil then
		error("Refusing to delete a root object.")
	end

	local fullName = target:GetFullName()
	target:Destroy()

	table.insert(resultLog, {
		type = operation.type,
		target = fullName,
		result = "deleted",
	})
end

local function coercePropertyValue(propertyName, propertyValue)
	if propertyName == "BrickColor" and type(propertyValue) == "string" then
		return BrickColor.new(propertyValue)
	end

	return propertyValue
end

local function applyEditProperties(operation, resultLog)
	local target = resolvePath(operation.path)
	if not target then
		error("Could not resolve instance for edit_properties: " .. tostring(operation.path))
	end

	local properties = operation.properties
	if type(properties) ~= "table" then
		error("edit_properties requires a properties table.")
	end

	local fullName = target:GetFullName()

	for propertyName, propertyValue in pairs(properties) do
		local hasProperty = pcall(function()
			return target[propertyName]
		end)

		if not hasProperty then
			table.insert(resultLog, {
				type = operation.type,
				target = fullName,
				property = tostring(propertyName),
				result = "missing-property-skip",
			})
		else
			local success, err = pcall(function()
				target[propertyName] = coercePropertyValue(propertyName, propertyValue)
			end)

			if success then
				table.insert(resultLog, {
					type = operation.type,
					target = fullName,
					property = tostring(propertyName),
					result = "updated",
				})
			else
				table.insert(resultLog, {
					type = operation.type,
					target = fullName,
					property = tostring(propertyName),
					result = "failed",
					error = tostring(err),
				})
			end
		end
	end
end

local function applyOperation(operation, resultLog)
	if operation.type == "ensure_instance" then
		applyEnsureInstance(operation, resultLog)
		return
	end

	if operation.type == "upsert_script" then
		applyUpsertScript(operation, resultLog)
		return
	end

	if operation.type == "delete_instance" then
		applyDeleteInstance(operation, resultLog)
		return
	end

	if operation.type == "edit_properties" then
		applyEditProperties(operation, resultLog)
		return
	end

	error("Unsupported operation type: " .. tostring(operation.type))
end

local function applyJob(job)
	local resultLog = {}
	ChangeHistoryService:SetWaypoint("Zest before apply")

	for _, operation in ipairs(job.operations or {}) do
		applyOperation(operation, resultLog)
	end

	ChangeHistoryService:SetWaypoint("Zest applied")
	return resultLog
end

local function completeJob(jobId, status, resultLog, lastError)
	return requestJson("plugin-sync", {
		action = "complete",
		workspaceToken = config.workspaceToken,
		pluginName = PLUGIN_NAME,
		jobId = jobId,
		status = status,
		resultLog = resultLog or {},
		lastError = lastError or "",
	}, true)
end

local function claimNextJob()
	return requestJson("plugin-sync", {
		action = "claim",
		workspaceToken = config.workspaceToken,
		pluginName = PLUGIN_NAME,
	}, true)
end

local function runSinglePass()
	saveConfig()
	setStatus("checking for jobs")

	local response = claimNextJob()
	local job = response.job

	if not job then
		setStatus("waiting for jobs")
		setLog("No queued jobs were available on Supabase.")
		return
	end

	setStatus("applying " .. (job.title or "plan"))
	setLog("Applying " .. tostring(#(job.operations or {})) .. " operations in Studio...")

	local ok, result = pcall(function()
		return applyJob(job)
	end)

	if ok then
		completeJob(job.id, "applied", result, "")
		setStatus("applied " .. (job.title or "plan"))
		setLog("Studio changes were applied and reported back to the web app.")
	else
		local err = tostring(result)
		pcall(function()
			completeJob(job.id, "failed", {}, err)
		end)
		setStatus("apply failed")
		setLog(err)
	end
end

local function syncLoop(loopId)
	while state.isRunning and state.loopId == loopId do
		local ok, err = pcall(runSinglePass)
		if not ok then
			setStatus("sync error")
			setLog(tostring(err))
		end

		task.wait(config.pollSeconds)
	end
end

local function startSync()
	saveConfig()
	if state.isRunning then
		return
	end

	state.isRunning = true
	state.loopId = (state.loopId or 0) + 1
	syncButton.Text = "Stop sync"
	setStatus("syncing")
	task.spawn(syncLoop, state.loopId)
end

local function stopSync()
	state.isRunning = false
	syncButton.Text = "Start sync"
	setStatus("stopped")
end

TOGGLE_BUTTON.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

saveButton.MouseButton1Click:Connect(function()
	local ok, err = pcall(saveConfig)
	if not ok then
		setStatus("save failed")
		setLog(tostring(err))
	end
end)

refreshStudioAccountLabel()

pairButton.MouseButton1Click:Connect(function()
	local ok, err = pcall(pairWithDashboardCode)
	if not ok then
		setStatus("pairing failed")
		setLog(tostring(err))
	end
end)

syncButton.MouseButton1Click:Connect(function()
	local ok, err = pcall(function()
		if state.isRunning then
			stopSync()
		else
			startSync()
		end
	end)

	if not ok then
		setStatus("sync failed")
		setLog(tostring(err))
	end
end)

runOnceButton.MouseButton1Click:Connect(function()
	local ok, err = pcall(runSinglePass)
	if not ok then
		setStatus("manual run failed")
		setLog(tostring(err))
	end
end)
