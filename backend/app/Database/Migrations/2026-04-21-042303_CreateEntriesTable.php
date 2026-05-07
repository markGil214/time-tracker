<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateEntriesTable extends Migration
{
	public function up()
	{
		$this->forge->addField([
			'id' => [
				'type'           => 'INT',
				'constraint'     => 11,
				'unsigned'       => true,
				'auto_increment' => true,
			],
			'work_date' => [
				'type' => 'DATE',
			],
			'morning_in' => [
				'type' => 'TIME',
				'null' => true,
			],
			'morning_out' => [
				'type' => 'TIME',
				'null' => true,
			],
			'afternoon_in' => [
				'type' => 'TIME',
				'null' => true,
			],
			'afternoon_out' => [
				'type' => 'TIME',
				'null' => true,
			],
			'status' => [
				'type'       => 'VARCHAR',
				'constraint' => 20,
				'default'    => 'OJT Day',
			],
			'total_minutes' => [
				'type'       => 'INT',
				'constraint' => 11,
				'unsigned'   => true,
				'default'    => 0,
			],
			'created_at' => [
				'type' => 'DATETIME',
				'null' => true,
			],
			'updated_at' => [
				'type' => 'DATETIME',
				'null' => true,
			],
		]);

		$this->forge->addKey('id', true);
		$this->forge->createTable('entries', true);
	}

	public function down()
	{
		$this->forge->dropTable('entries', true);
	}
}