-- Split-with-friends goals: lets other users join a goal via an invite code
-- and link their own SIPs to it, so the goal fills up from everyone's payments.
ALTER TABLE Goal
  ADD COLUMN Invite_Code VARCHAR(8) NULL UNIQUE;

CREATE TABLE Goal_Member (
  Goal_Member_ID INT AUTO_INCREMENT PRIMARY KEY,
  Goal_ID INT NOT NULL,
  User_ID INT NOT NULL,
  Joined_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (Goal_ID) REFERENCES Goal(Goal_ID) ON DELETE CASCADE,
  FOREIGN KEY (User_ID) REFERENCES User(User_ID) ON DELETE CASCADE,
  UNIQUE KEY uniq_goal_member (Goal_ID, User_ID)
);
