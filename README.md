![](assets/rover.jpg)

### Hardware you need

1. **RaspberryPi** (A+ is the optimal but should work with B,B+)
2. **RaspberryPi Camera module**
3. **Micro SD Card** 
4. **USB Wifi dongle**
5. **Piface digital** - [Piface](http://www.piface.org.uk/products/piface_digital/) can be replaced with arduino / hat / relay, but the code of the robot should be adapted
6. **Portable battery** with microUSB for RaspberryPi power, you will need more power if using other RaspberryPi than A+
7. **Rover kit** any similar kit to [this](http://www.active-robots.com/4wd-atv-robot-chassis-kit) should work fine

## Getting Started

This tutorial will work with raspbian-wheezy, you can download this from here: https://downloads.raspberrypi.org/raspbian/images/raspbian-2015-05-07/2015-05-05-raspbian-wheezy.zip, is not working with jessie yet...

Make a clean install of raspbian-wheezy on your sdcard, instructions here: https://www.raspberrypi.org/documentation/installation/installing-images/
For the first steps you will need a TV or monitor with HDMI, USB keyboard, USB mouse and the USB Wifi dongle connected.

In the first boot in raspi-config expand file system, enable ssh, camera module and piface, also change hostname from raspberrypi to nodebot.

Execute this command:
	sudo nano /etc/wpa_supplicant/wpa_supplicant.conf

at the end add wifi configuration like this:

	network={
		ssid="wifi_name"
		psk="wifi_password"
	}

save and exit

	sudo reboot

After reboot, check raspberrypi_ip with this command: 
	ifconfig

In your computer you can connect via ssh:
ssh pi@raspberrypi_ip
password: raspberry

Now you can disconnect TV or monitor, USB keyboard and USB mouse, just leave the USB Wifi dongle.

Upgrade system with these commands:

	sudo apt-get update
	sudo apt-get -y upgrade
	sudo rpi-update

	sudo nano /boot/cmdline.txt

At the end of the line add one space and: 

	cgroup_enable=memory

	sudo reboot

After reboot:
	sudo apt-get -y install automake libtool git
	git clone https://github.com/thomasmacpherson/piface.git
	cd piface/c
	./autogen.sh && ./configure && make && sudo make install
	sudo ldconfig
	cd ../scripts
	sudo ./spidev-setup

sudo reboot

After reboot:
	wget http://node-arm.herokuapp.com/node_0.10.36_armhf.deb
	sudo dpkg -i node_0.10.36_armhf.deb
	sudo npm install pm2@latest -g --unsafe-perm
	pm2 startup ubuntu

Pay attention it should ask you to run another command, copy, paste and run that command

	git clone https://github.com/sergioaraki/Nodebot-Rover.git
	sudo mv /home/pi/Nodebot-Rover/Robot /home/pi/Robot
	cd Robot
	npm install
	cd ..

	sudo apt-get -y install hostapd isc-dhcp-server

	sudo nano /etc/dhcp/dhcpd.conf

Comment this 2 lines:

	#option domain-name "example.org";
	#option domain-name-servers ns1.example.org, ns2.example.org;

And add this at the end of the file:

	authoritative;

	subnet 192.168.42.0 netmask 255.255.255.0 { 
	  range 192.168.42.10 192.168.42.50;
	  option broadcast-address 192.168.42.255; option routers 192.168.42.1; default-lease-time 600;
	  max-lease-time 7200;
	  option domain-name "local";
	  option domain-name-servers 8.8.8.8, 8.8.4.4;
	}

Save, exit and then execute this command:
	sudo nano /etc/default/isc-dhcp-server

Modify the last line:

	INTERFACES="wlan0"

Save, exit and then execute this commands:
	sudo ifdown wlan0
	sudo nano /etc/network/interfaces

And left this file like this:

	auto lo
	iface lo inet loopback

	auto eth0
	allow-hotplug eth0
	iface eth0 inet dhcp

	allow-hotplug wlan0
	iface wlan0 inet static
	address 192.168.42.1
	netmask 255.255.255.0

Save, exit and then execute this commands:
	sudo ifconfig wlan0 192.168.42.1
	sudo nano /etc/hostapd/hostapd.conf

And left this file like this (unless you want to change ssid and password):

	interface=wlan0
	driver=rtl871xdrv
	ssid=Nodebot
	hw_mode=g
	channel=6
	macaddr_acl=0
	auth_algs=1
	ignore_broadcast_ssid=0
	wpa=2
	wpa_passphrase=password
	wpa_key_mgmt=WPA-PSK
	wpa_pairwise=TKIP
	rsn_pairwise=CCMP

Save, exit and then execute this command:
	sudo nano /etc/default/hostapd

At the end of the file add this line:

	DAEMON_CONF="/etc/hostapd/hostapd.conf"

Save, exit and then execute this command:
	sudo nano /etc/sysctl.conf

Uncomment this line:

	net.ipv4.ip_forward=1

Save, exit and then execute this commands:
	sudo sh -c "echo 1 > /proc/sys/net/ipv4/ip_forward"
	sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
	sudo iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
	sudo iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT
	sudo sh -c "iptables-save > /etc/iptables.ipv4.nat"
	sudo nano /etc/network/interfaces

At the end of the file add this line:

	up iptables-restore < /etc/iptables.ipv4.nat

Save, exit and then execute this commands:
	sudo wget http://www.daveconroy.com/wp3/wp-content/uploads/2013/07/hostapd.zip
	sudo unzip hostapd.zip 
	sudo mv /usr/sbin/hostapd /usr/sbin/hostapd.old
	sudo mv hostapd /usr/sbin/hostapd
	sudo chown root.root /usr/sbin/hostapd
	sudo chmod 755 /usr/sbin/hostapd
	sudo service hostapd start
	sudo service isc-dhcp-server start
	sudo update-rc.d hostapd enable
	sudo update-rc.d isc-dhcp-server enable

If your wifi dongle requires 8188eu drivers, check this [Post](https://www.raspberrypi.org/forums/viewtopic.php?p=462982) and follow instructions to install them

Execute this commands:
	sudo mkdir /ram
	sudo nano /etc/fstab

Add this line:

	tmpfs /ram tmpfs nodev,nosuid,size=1M 0 0 

Save, exit and then execute this commands:
	sudo mount -a
	pm2 start /home/pi/Robot/process.json
	pm2 save
	sudo nano /etc/wpa_supplicant/wpa_supplicant.conf

remove the wifi configuration added before, save and exit

	sudo reboot

Now you can connect to the Nodebot wifi in your computer or smartphone and access in your browser to: http://192.168.42.1:3000 and get control of your nodebot.

![](assets/web.png)