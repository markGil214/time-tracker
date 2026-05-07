<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddUserForeignKeyToEntries extends Migration
{
	public function up()
	{
		$this->forge->addColumn('entries', [
			'user_id' => [
				'type'       => 'INT',
				'constraint' => 11,
				'unsigned'   => true,
				'null'       => true,
				'after'      => 'id',
			],
		]);

		$this->db->query('ALTER TABLE `entries` ADD INDEX `idx_entries_user_id` (`user_id`)');
		$this->db->query('ALTER TABLE `entries` ADD CONSTRAINT `fk_entries_user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE');

		$firstUser = $this->db->table('users')->select('id')->orderBy('id', 'ASC')->get()->getFirstRow('array');

		if ($firstUser && isset($firstUser['id'])) {
			$this->db->table('entries')->set('user_id', (int) $firstUser['id'])->where('user_id', null)->update();
		}
	}

	public function down()
	{
		$this->db->query('ALTER TABLE `entries` DROP FOREIGN KEY `fk_entries_user_id`');
		$this->db->query('ALTER TABLE `entries` DROP INDEX `idx_entries_user_id`');
		$this->forge->dropColumn('entries', 'user_id');
	}
}