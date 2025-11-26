"use client";

import { AnimatePresence, motion } from "framer-motion";

interface RecurringForm {
  title: string;
  description: string;
  location: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
  exceptions: string[];
  meeting_type: "personal" | "team";
  selected_team_id: string;
}

interface UserTeam {
  id: string;
  name: string;
  slug: string;
  school: string;
  user_role: string;
  team_id: string;
}

interface RecurringMeetingModalProps {
  darkMode: boolean;
  showModal: boolean;
  recurringForm: RecurringForm;
  userTeams: UserTeam[];
  onClose: () => void;
  onFormChange: (updates: Partial<RecurringForm>) => void;
  onSubmit: () => void;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RecurringMeetingModal({
  darkMode,
  showModal,
  recurringForm,
  userTeams,
  onClose,
  onFormChange,
  onSubmit,
}: RecurringMeetingModalProps) {
  const handleTeamSelection = (value: string) => {
    if (value === "personal") {
      onFormChange({
        meeting_type: "personal",
        selected_team_id: "",
      });
    } else if (value.startsWith("all-")) {
      onFormChange({
        meeting_type: "team",
        selected_team_id: value,
      });
    } else {
      onFormChange({
        meeting_type: "team",
        selected_team_id: value,
      });
    }
  };

  const handleDayToggle = (dayIndex: number, checked: boolean) => {
    if (checked) {
      onFormChange({
        days_of_week: [...recurringForm.days_of_week, dayIndex],
      });
    } else {
      onFormChange({
        days_of_week: recurringForm.days_of_week.filter((d) => d !== dayIndex),
      });
    }
  };

  const getTeamOptions = () => {
    type TeamOption = UserTeam & { isAllTeams?: boolean; team_id?: string };
    return userTeams.reduce((acc: TeamOption[], team) => {
      const schoolKey = team.school || "Unknown School";
      const existingGroup = acc.find((group) => group.school === schoolKey);

      if (existingGroup) {
        acc.push(team);
      } else {
        acc.push({
          id: `all-${schoolKey}`,
          school: schoolKey,
          team_id: "All",
          isAllTeams: true,
          name: "",
          slug: "",
          user_role: "",
        });
        acc.push(team);
      }

      return acc;
    }, []);
  };

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`max-w-md w-full mx-4 rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3
                className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
              >
                Create Recurring Meeting
              </h3>

              <div className="space-y-4">
                <div>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is properly associated with input below */}
                  <label
                    className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Meeting Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={recurringForm.title}
                    onChange={(e) => onFormChange({ title: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    placeholder="e.g., Weekly Science Olympiad Practice"
                  />
                </div>

                <div>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Label groups related checkboxes */}
                  <label
                    className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Days of Week <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {dayNames.map((day, index) => (
                      <label key={day} className="flex flex-col items-center">
                        <input
                          type="checkbox"
                          checked={recurringForm.days_of_week.includes(index)}
                          onChange={(e) => handleDayToggle(index, e.target.checked)}
                          className="mb-1"
                        />
                        <span className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {day.charAt(0)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is properly associated with input below */}
                    <label
                      className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={recurringForm.start_date}
                      onChange={(e) => onFormChange({ start_date: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>

                  <div>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is properly associated with input below */}
                    <label
                      className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={recurringForm.end_date}
                      onChange={(e) => onFormChange({ end_date: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is properly associated with input below */}
                    <label
                      className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Start Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={recurringForm.start_time}
                      onChange={(e) => onFormChange({ start_time: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      placeholder="Leave empty for all-day events"
                    />
                  </div>

                  <div>
                    {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is properly associated with input below */}
                    <label
                      className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                    >
                      End Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={recurringForm.end_time}
                      onChange={(e) => onFormChange({ end_time: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        darkMode
                          ? "bg-gray-700 border-gray-600 text-white"
                          : "bg-white border-gray-300 text-gray-900"
                      }`}
                      placeholder="Leave empty for all-day events"
                    />
                  </div>
                </div>

                <div>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is properly associated with select below */}
                  <label
                    className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Meeting Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={
                      recurringForm.meeting_type === "personal"
                        ? "personal"
                        : recurringForm.selected_team_id || "personal"
                    }
                    onChange={(e) => handleTeamSelection(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="personal">Personal</option>
                    {getTeamOptions().map((team) => (
                      <option
                        key={team.id}
                        value={team.isAllTeams ? `all-${team.school}` : team.id}
                      >
                        {team.isAllTeams
                          ? `${team.school} - All Subteams`
                          : `${team.school} - Team ${team.team_id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Label is properly associated with input below */}
                  <label
                    className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Location
                  </label>
                  <input
                    type="text"
                    value={recurringForm.location}
                    onChange={(e) => onFormChange({ location: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                    placeholder="Meeting location"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  Create Recurring Meeting
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
