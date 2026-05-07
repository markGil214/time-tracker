<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class EntriesSeeder extends Seeder
{
	public function run()
	{
		$targetUsername = env('seed.entriesUsername', 'seeduser');
		$targetPassword = env('seed.entriesPassword', 'password123');

		$usersTable = $this->db->table('users');
		$existingUser = $usersTable->select('id, username')->where('username', $targetUsername)->get()->getFirstRow('array');

		if ($existingUser && isset($existingUser['id'])) {
			$userId = (int) $existingUser['id'];
		} else {
			$usersTable->insert([
				'username' => $targetUsername,
				'password_hash' => password_hash($targetPassword, PASSWORD_DEFAULT),
				'created_at' => date('Y-m-d H:i:s'),
				'updated_at' => date('Y-m-d H:i:s'),
			]);

			$userId = (int) $this->db->insertID();
		}

		// Attach legacy rows without owner to the configured seed user.
		$this->db->table('entries')->set('user_id', $userId)->where('user_id', null)->update();

		// Make seeding idempotent for this user.
		$this->db->table('entries')->where('user_id', $userId)->delete();

		$records = [
			['work_date' => '2026-02-02', 'morning_in' => '06:50:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:57:00', 'afternoon_out' => '18:05:00', 'status' => 'OJT Day', 'total_minutes' => 618],
			['work_date' => '2026-02-03', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:58:00', 'afternoon_out' => '18:10:00', 'status' => 'OJT Day', 'total_minutes' => 612],
			['work_date' => '2026-02-04', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 600],
			['work_date' => '2026-02-05', 'morning_in' => '07:58:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 602],
			['work_date' => '2026-02-09', 'morning_in' => '07:03:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:56:00', 'afternoon_out' => '18:05:00', 'status' => 'OJT Day', 'total_minutes' => 606],
			['work_date' => '2026-02-10', 'morning_in' => '06:57:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 603],
			['work_date' => '2026-02-11', 'morning_in' => '06:54:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 606],
			['work_date' => '2026-02-12', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 600],
			['work_date' => '2026-02-16', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 600],
			['work_date' => '2026-02-17', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'No OJT Class', 'total_minutes' => 0],
			['work_date' => '2026-02-18', 'morning_in' => '07:08:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:13:00', 'status' => 'OJT Day', 'total_minutes' => 605],
			['work_date' => '2026-02-19', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 600],
			['work_date' => '2026-02-23', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'No OJT Class', 'total_minutes' => 0],
			['work_date' => '2026-02-24', 'morning_in' => '07:00:00', 'morning_out' => '12:03:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 603],
			['work_date' => '2026-02-25', 'morning_in' => '07:05:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 595],
			['work_date' => '2026-02-26', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:15:00', 'status' => 'OJT Day', 'total_minutes' => 615],
			['work_date' => '2026-03-02', 'morning_in' => '07:07:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:08:00', 'status' => 'OJT Day', 'total_minutes' => 601],
			['work_date' => '2026-03-03', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'No OJT Class', 'total_minutes' => 0],
			['work_date' => '2026-03-04', 'morning_in' => '07:58:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 602],
			['work_date' => '2026-03-05', 'morning_in' => '07:48:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:55:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 617],
			['work_date' => '2026-03-09', 'morning_in' => '07:50:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:57:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 613],
			['work_date' => '2026-03-10', 'morning_in' => '07:58:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:55:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 547],
			['work_date' => '2026-03-11', 'morning_in' => '07:50:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 610],
			['work_date' => '2026-03-12', 'morning_in' => '07:48:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:50:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 562],
			['work_date' => '2026-03-16', 'morning_in' => '07:40:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:55:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 625],
			['work_date' => '2026-03-17', 'morning_in' => '07:58:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 602],
			['work_date' => '2026-03-18', 'morning_in' => '08:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:50:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 610],
			['work_date' => '2026-03-19', 'morning_in' => '08:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 600],
			['work_date' => '2026-03-23', 'morning_in' => '07:45:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 555],
			['work_date' => '2026-03-24', 'morning_in' => '07:40:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:58:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 562],
			['work_date' => '2026-03-25', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:55:00', 'afternoon_out' => '18:03:00', 'status' => 'OJT Day', 'total_minutes' => 608],
			['work_date' => '2026-03-26', 'morning_in' => '07:58:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:55:00', 'afternoon_out' => '18:03:00', 'status' => 'OJT Day', 'total_minutes' => 550],
			['work_date' => '2026-03-30', 'morning_in' => '07:58:00', 'morning_out' => '12:05:00', 'afternoon_in' => '12:53:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 554],
			['work_date' => '2026-03-31', 'morning_in' => '07:30:00', 'morning_out' => '12:03:00', 'afternoon_in' => '12:40:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 593],
			['work_date' => '2026-04-01', 'morning_in' => '08:00:00', 'morning_out' => '10:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '15:00:00', 'status' => 'OJT Day', 'total_minutes' => 240],
			['work_date' => '2026-04-02', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'No OJT Class', 'total_minutes' => 0],
			['work_date' => '2026-04-06', 'morning_in' => '07:34:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:55:00', 'afternoon_out' => '18:04:00', 'status' => 'OJT Day', 'total_minutes' => 575],
			['work_date' => '2026-04-07', 'morning_in' => '08:08:00', 'morning_out' => '12:03:00', 'afternoon_in' => '12:50:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 605],
			['work_date' => '2026-04-08', 'morning_in' => '08:10:00', 'morning_out' => '12:01:00', 'afternoon_in' => '12:40:00', 'afternoon_out' => '19:00:00', 'status' => 'OJT Day', 'total_minutes' => 611],
			['work_date' => '2026-04-09', 'morning_in' => '06:57:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'No OJT Class', 'total_minutes' => 0],
			['work_date' => '2026-04-13', 'morning_in' => '06:57:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:45:00', 'afternoon_out' => '18:05:00', 'status' => 'OJT Day', 'total_minutes' => 623],
			['work_date' => '2026-04-14', 'morning_in' => '07:03:00', 'morning_out' => '12:05:00', 'afternoon_in' => '12:50:00', 'afternoon_out' => '18:04:00', 'status' => 'OJT Day', 'total_minutes' => 616],
			['work_date' => '2026-04-15', 'morning_in' => '07:15:00', 'morning_out' => '12:05:00', 'afternoon_in' => '12:55:00', 'afternoon_out' => '18:10:00', 'status' => 'OJT Day', 'total_minutes' => 605],
			['work_date' => '2026-04-16', 'morning_in' => '07:30:00', 'morning_out' => '12:00:00', 'afternoon_in' => '12:50:00', 'afternoon_out' => '18:30:00', 'status' => 'OJT Day', 'total_minutes' => 610],
			['work_date' => '2026-04-20', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 600],
			['work_date' => '2026-04-21', 'morning_in' => '07:00:00', 'morning_out' => '12:00:00', 'afternoon_in' => '13:00:00', 'afternoon_out' => '18:00:00', 'status' => 'OJT Day', 'total_minutes' => 600],
		];

		$records = array_map(static function ($record) use ($userId) {
			$record['user_id'] = $userId;
			return $record;
		}, $records);

		$this->db->table('entries')->insertBatch($records);
	}
}