<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddNotesToEntriesTable extends Migration
{
	public function up()
	{
		$this->forge->addColumn('entries', [
			'notes' => [
				'type' => 'TEXT',
				'null' => true,
				'after' => 'status',
			],
		]);
	}

	public function down()
	{
		$this->forge->dropColumn('entries', 'notes');
	}
}
